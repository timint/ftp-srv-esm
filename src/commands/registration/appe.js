import { TimeoutError } from '../../errors.js';

export default {
  directive: 'APPE',
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.write) return this.reply(402, 'Not supported by file system');

    const fileName = command.arg;

    return this.connector.waitForConnection()
      .then(() => this.commandSocket.pause())
      .then(() => Promise.resolve().then(() => this.fs.write(fileName, {append: true, start: this.restByteCount})))
      .then((fsResponse) => {
        let {stream, clientPath} = fsResponse;
        if (!stream && !clientPath) {
          stream = fsResponse;
          clientPath = fileName;
        }
        const serverPath = stream.path || fileName;

        const destroyConnection = (connection, reject) => (err) => {
          try {
            if (connection) {
              if (connection.writable) connection.end();
              connection.destroy(err);
            }
          } finally {
            reject(err);
          }
        };

        const streamPromise = new Promise((resolve, reject) => {
          stream.once('error', destroyConnection(this.connector.socket, reject));
          stream.once('finish', () => resolve());
        });

        const socketPromise = new Promise((resolve, reject) => {
          this.connector.socket.pipe(stream, {end: false});
          this.connector.socket.once('end', () => {
            if (stream.listenerCount('close')) stream.emit('close');
            else stream.end();
            resolve();
          });
          this.connector.socket.once('error', destroyConnection(stream, reject));
        });

        this.restByteCount = 0;

        return this.reply(150)
          .then(() => this.connector.socket && this.connector.socket.resume())
          .then(() => Promise.all([streamPromise, socketPromise]))
          .then(() => this.emit('STOR', null, serverPath))
          .then(() => this.reply(226, clientPath));
      })
      .catch((err) => {
        log.error(err);
        if (err instanceof TimeoutError) {
          return this.reply(425, 'No connection established');
        }
        this.emit('STOR', err);
        return this.reply(550, err.message);
      })
      .then(() => {
        this.connector.end();
        this.commandSocket.resume();
      });
  },
  syntax: '{{cmd}} <path>',
  description: 'Append to a file'
};
