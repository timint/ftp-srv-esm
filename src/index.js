import { readFileSync } from 'fs';
import winston from 'winston';
import net from 'net';
import tls from 'tls';
import EventEmitter from 'events';

import Connection from './connection.js';
import { getNextPortFactory } from './helpers/find-port.js';
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)).toString());

class FtpServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = Object.assign({
      log: winston.createLogger({
        name: packageJson.name,
        silent: true,
        format: winston.format.simple(),
        transports: [new winston.transports.Console({ level: 'silly' })]
      }),
      url: 'ftp://127.0.0.1:21',
      pasv_min: 1024,
      pasv_max: 65535,
      pasv_hostname: null,
      anonymous: false,
      list_format: 'ls',
      blacklist: [],
      whitelist: [],
      greeting: null,
      tls: false,
      timeout: 0,
      endOnProcessSignal: true
    }, Object.fromEntries(Object.entries(options).filter(([_, v]) => v !== undefined)));

    this._greeting = this.setupGreeting(this.options.greeting);
    this._features = this.setupFeaturesMessage();

    delete this.options.greeting;

    this.connections = {};
    this.log = this.options.log;
    this.url = new URL(this.options.url);
    this.getNextPasvPort = getNextPortFactory(
      this.url?.hostname,
      this.options?.pasv_min,
      this.options?.pasv_max);

    const timeout = Number(this.options.timeout);
    this.options.timeout = isNaN(timeout) ? 0 : Number(timeout);

    const serverConnectionHandler = (socket) => {
      this.options.timeout > 0 && socket.setTimeout(this.options.timeout);
      let connection = new Connection(this, {log: this.log, socket});
      this.connections[connection.id] = connection;

      socket.on('close', () => this.disconnectClient(connection.id));
      socket.once('close', () => {
        this.emit('disconnect', {connection, id: connection.id, newConnectionCount: Object.keys(this.connections).length});
      })

      this.emit('connect', {connection, id: connection.id, newConnectionCount: Object.keys(this.connections).length});

      const greeting = this._greeting || [];
      const features = this._features || 'Ready';
      return connection.reply(220, ...greeting, features)
        .then(() => socket.resume());
    };
    const serverOptions = Object.assign({}, this.isTLS ? this.options.tls : {}, {pauseOnConnect: true});

    this.server = (this.isTLS ? tls : net).createServer(serverOptions, serverConnectionHandler);
    this.server.on('error', (err) => {
      this.log.error('[Event] error', {error: err});
      this.emit('server-error', {error: err});
    });

    const quit = (() => {
      let timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => this.quit(), 100);
      };
    })();

    if (this.options.endOnProcessSignal) {
      process.on('SIGTERM', quit);
      process.on('SIGINT', quit);
      process.on('SIGQUIT', quit);
    }
  }

  get isTLS() {
    return this.url.protocol === 'ftps:' && this.options.tls;
  }

  listen() {
    if (!this.options.pasv_hostname) {
      this.log.warn('Passive URL not set. Passive connections not available.');
    }

    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.url.port, this.url.hostname, (err) => {
        this.server.removeListener('error', reject);
        if (err) return reject(err);
        this.log.info('Listening', {
          protocol: this.url.protocol.replace(/\W/g, ''),
          ip: this.url.hostname,
          port: this.url.port
        });
        resolve('Listening');
      });
    });
  }

  emitPromise(action, ...data) {
    return new Promise((resolve, reject) => {
      const params = [...data, resolve, reject];
      this.emit.call(this, action, ...params);
    });
  }

  setupGreeting(greet) {
    if (!greet) return [];
    const greeting = Array.isArray(greet) ? greet : greet.split('\n');
    return greeting;
  }

  setupFeaturesMessage() {
    let features = [];
    if (this.options.anonymous) features.push('a');

    if (features.length) {
      features.unshift('Features:');
      features.push('.');
    }
    return features.length ? features.join(' ') : 'Ready';
  }

  disconnectClient(id) {
    return new Promise((resolve, reject) => {
      const client = this.connections[id];
      if (!client) return resolve();
      delete this.connections[id];

      setTimeout(() => {
        reject(new Error('Timed out disconnecting the client'))
      }, this.options.timeout || 1e3)

      try {
        client.close(0);
      } catch (err) {
        this.log.error('Error closing connection: '+ err, {id});
      }

      resolve('Disconnected');
    });
  }

  quit() {
    return this.close()
    .then(() => process.exit(0));
  }

  close() {
    this.server.maxConnections = 0;
    this.emit('closing');
    this.log.info('Closing connections:', Object.keys(this.connections).length);

    return Promise.all(Object.keys(this.connections).map((id) => this.disconnectClient(id)))
    .then(() => new Promise((resolve) => {
      this.server.close((err) => {
        this.log.info('Server closing...');
        if (err) this.log.error('Error closing server', {error: err});
        resolve('Closed');
      });
    }))
    .then(() => {
      this.log.debug('Removing event listeners...')
      this.emit('closed', {});
      this.removeAllListeners();
      return;
    });
  }

}

export default FtpServer;
