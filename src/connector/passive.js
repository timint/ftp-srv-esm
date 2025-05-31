import net from 'net';
import tls from 'tls';
import Connector from './base.js';
import errors from '../errors.js';

const CONNECT_TIMEOUT = 30e3;

class Passive extends Connector {
  constructor(connection) {
    super(connection);
    this.type = 'passive';
  }

  waitForConnection({timeout = 5e3, delay = 250} = {}) {
    if (!this.dataServer) return Promise.reject(new errors.ConnectorError('Passive server not setup'));

    const checkSocket = () => {
      if (this.dataServer && this.dataServer.listening && this.dataSocket && this.dataSocket.connected) {
        return Promise.resolve(this.dataSocket);
      }

      return new Promise((resolve) => setTimeout(resolve, delay))
        .then(() => checkSocket());
    };

    return Promise.race([
      checkSocket(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TimeoutError')), timeout))
    ]);
  }

  setupServer() {
    this.closeServer();
    return this.server.getNextPasvPort()
    .then((port) => {
      this.dataSocket = null;
      let idleServerTimeout;

      const connectionHandler = (socket) => {
        // Normalize IPv6-mapped IPv4 addresses for comparison
        const normalizeAddress = addr => addr.replace(/^::ffff:/, '');
        if (normalizeAddress(this.connection.commandSocket.remoteAddress) !== normalizeAddress(socket.remoteAddress)) {
          this.log.error('Connecting addresses do not match', {
            pasv_connection: socket.remoteAddress,
            cmd_connection: this.connection.commandSocket.remoteAddress
          });

          socket.destroy();
          return this.connection.reply(550, 'Remote addresses do not match')
          .then(() => this.connection.close());
        }
        clearTimeout(idleServerTimeout);

        this.log.debug('Passive connection fulfilled.', {
          port: port,
          remoteAddress: socket.remoteAddress
        });

        this.dataSocket = socket;
        this.dataSocket.on('error', (err) => this.server && this.server.emit('client-error', {connection: this.connection, context: 'dataSocket', error: err}));
        this.dataSocket.once('close', () => this.closeServer());

        if (!this.connection.secure) {
          this.dataSocket.connected = true;
        }
      };

      const serverOptions = Object.assign({}, this.connection.secure ? this.server.options.tls : {}, {pauseOnConnect: true});
      this.dataServer = (this.connection.secure ? tls : net).createServer(serverOptions, connectionHandler);
      this.dataServer.maxConnections = 1;

      this.dataServer.on('error', (err) => this.server && this.server.emit('client-error', {connection: this.connection, context: 'dataServer', error: err}));
      this.dataServer.once('close', () => {
        this.log.debug('Passive server closed');
        this.end();
      });

      if (this.connection.secure) {
        this.dataServer.on('secureConnection', (socket) => {
          socket.connected = true;
        });
      }

      return new Promise((resolve, reject) => {
        this.dataServer.listen(port, this.server.url.hostname, (err) => {
          if (err) reject(err);
          else {
            idleServerTimeout = setTimeout(() => this.closeServer(), CONNECT_TIMEOUT);

            this.log.debug('Passive connection listening', {port: port});
            resolve(this.dataServer);
          }
        });
      });
    })
    .catch((error) => {
      this.log.debug(error.message, error);
      throw error;
    });
  }

}

export default Passive;
