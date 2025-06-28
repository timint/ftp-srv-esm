export default {
  directive: 'NLST',
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported by file system');
    if (!this.fs.list) return this.reply(402, 'Not supported by file system');

    const path = command.arg || '.';

    return this.connector.waitForConnection()
    .then(() => { this.commandSocket.pause(); })
    .then(() => this.fs.get(path))
    .then((stat) => stat.isDirectory() ? this.fs.list(path) : [stat])
    .then((files) => {
      this.reply(150, `Accepted data connection, returning ${files.length} file(s)`);

      if (!files) {
        return this.reply({ raw: true, socket: this.connector.socket, useEmptyMessage: true});
      }

      const message = files.map((file) => {
        return file.name;
      }).join('\r\n');

      this.reply({}, {
        raw: true,
        message: message,
        socket: this.connector.socket
      });
    })
    .then(() => this.reply(226))
    .catch((err) => {
      if (err && err.name === 'TimeoutError') {
        log.error(err);
        return this.reply(425, 'No connection established');
      }
      log.error(err);
      return this.reply(451, err.message || 'No directory');
    })
    .then(() => {
      this.connector.end();
      this.commandSocket.resume();
    });
  },
  syntax: '{{cmd}} [<path>]',
  description: 'Returns a list of file names in a specified directory'
};
