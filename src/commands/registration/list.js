import getFileStat from '../../helpers/file-stat.js';

// http://cr.yp.to/ftp/list.html
// http://cr.yp.to/ftp/list/eplf.html

export default {
  directive: 'LIST',
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported by file system');
    if (!this.fs.list) return this.reply(402, 'Not supported by file system');

    const simple = command.directive === 'NLST';

    // Parse command arguments: ignore options (starting with '-')
    let path = '.';
    if (command.arg) {
      // Split by spaces, filter out options
      const args = command.arg.split(/\s+/).filter(Boolean);
      const nonOption = args.find(arg => !arg.startsWith('-'));
      if (nonOption) path = nonOption;
    }
    return this.connector.waitForConnection()
    .then(() => { this.commandSocket.pause(); })
    .then(() => this.fs.get(path))
    .then((stat) => stat.isDirectory() ? this.fs.list(path) : [stat])
    .then((files) => {
      this.reply(150, `Accepted data connection, returning ${files.length} file(s)`);

      if (!files) {
        return this.reply({ raw: true, socket: this.connector.socket, useEmptyMessage: true});
      }

      // Build a single string with all file entries separated by \r\n
      const message = files.map((file) => {
        if (simple) return file.name;
        const fileFormat = this?.server?.options?.list_format ?? 'ls';
        return getFileStat(file, fileFormat);
      }).join('\r\n');

      return this.reply({ raw: true, socket: this.connector.socket }, message);
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
  description: 'Returns information of a file or directory if specified, else information of the current working directory is returned'
};
