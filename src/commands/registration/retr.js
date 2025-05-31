import { TimeoutError } from '../../errors.js';

export default {
  directive: 'RETR',
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.read) return this.reply(402, 'Not supported by file system');

    const filePath = command.arg;

    return this.connector.waitForConnection()
      .then(() => { this.commandSocket.pause(); })
      .then(() => Promise.resolve().then(() => this.fs.read(filePath, {start: this.restByteCount})))
      .then((fsResponse) => {
        let {stream, clientPath} = fsResponse;
        if (!stream && !clientPath) {
          stream = fsResponse;
          clientPath = filePath;
        }
        const serverPath = stream.path || filePath;

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

      const eventsPromise = new Promise((resolve, reject) => {
        stream.on('data', (data) => {
          if (stream) stream.pause();
          if (this.connector.socket) {
            this.connector.socket.write(data, () => stream && stream.resume());
          }
        });
        stream.once('end', () => resolve());
        stream.once('error', destroyConnection(this.connector.socket, reject));

        this.connector.socket.once('error', destroyConnection(stream, reject));
      });

      this.restByteCount = 0;

      return this.reply(150).then(() => stream.resume() && this.connector.socket.resume())
      .then(() => eventsPromise)
      .then(() => this.emit('RETR', null, serverPath))
      .then(() => this.reply(226, clientPath))
      .then(() => stream.destroy && stream.destroy());
    })
    .catch((err) => {
      if (err && err instanceof TimeoutError) {
        log.error(err);
        return this.reply(425, 'No connection established');
      }
      log.error(err);
      this.emit('RETR', err);
      return this.reply(551, err.message);
    })
    .then(() => {
      this.connector.end();
      this.commandSocket.resume();
    });
  },
  syntax: '{{cmd}} <path>',
  description: 'Retrieve a file'
};
