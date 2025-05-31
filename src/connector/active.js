import tls from 'tls';
import * as ip from 'neoip'
import { Socket } from 'net';
import Connector from './base.js';
import { SocketError } from '../errors.js';

class Active extends Connector {
  constructor(connection) {
    super(connection);
    this.type = 'active';
  }

  waitForConnection({timeout = 5e3, delay = 250} = {}) {
    const checkSocket = () => {
      if (this.dataSocket && this.dataSocket.connected) {
        return Promise.resolve(this.dataSocket);
      }
      // Native delay implementation
      return new Promise((resolve) => setTimeout(resolve, delay))
        .then(() => checkSocket());
    };

    // Native timeout implementation
    return Promise.race([
      checkSocket(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TimeoutError')), timeout))
    ]);
  }

  setupConnection(host, port, family = 4) {
    const closeExistingServer = () => Promise.resolve(
      this.dataSocket ? this.dataSocket.destroy() : undefined);

    return closeExistingServer()
    .then(() => {
      if (!ip.isEqual(this.connection.commandSocket.remoteAddress, host)) {
        throw new SocketError('The given address is not yours', 500);
      }

      this.dataSocket = new Socket();
      this.dataSocket.on('error', (err) => this.server && this.server.emit('client-error', {connection: this.connection, context: 'dataSocket', error: err}));
      this.dataSocket.connect({host, port, family}, () => {
        this.dataSocket.pause();

        if (this.connection.secure) {
          const secureContext = tls.createSecureContext(this.server.options.tls);
          const secureSocket = new tls.TLSSocket(this.dataSocket, {
            isServer: true,
            secureContext
          });
          this.dataSocket = secureSocket;
        }
        this.dataSocket.connected = true;
      });
    });
  }
}

export default Active;
