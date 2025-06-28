import getFileStat from '../../helpers/file-stat.js';

// RFC 3659 - Extensions to FTP
// MLSD (Machine Readable Directory Listing)

export default {
  directive: 'MLSD',
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported by file system');
    if (!this.fs.list) return this.reply(402, 'Not supported by file system');

    // Parse command arguments: extract options and path
    let path = '.';
    let showHidden = false;
    if (command.arg) {
      // Split by spaces, filter out empty strings
      const args = command.arg.split(/\s+/).filter(Boolean);

      // Check for options
      const options = args.filter(arg => arg.startsWith('-'));
      showHidden = options.some(opt => opt.includes('a')); // -a or -al

      // Find the path (non-option argument)
      const nonOption = args.find(arg => !arg.startsWith('-'));
      if (nonOption) path = nonOption;
    }

    return this.connector.waitForConnection()
    .then(() => { this.commandSocket.pause(); })
    .then(() => this.fs.get(path))
    .then((stat) => stat.isDirectory() ? this.fs.list(path, { showHidden }) : [stat])
    .then((files) => {
      this.reply(150, `Accepted data connection, returning ${files.length} file(s)`);

      if (!files) {
        return this.reply({ raw: true, socket: this.connector.socket, useEmptyMessage: true});
      }

      // Build MLSD format: each line contains facts followed by filename
      const message = files.map((file) => {
        return getFileStat(file, 'mlsd');
      }).join('\r\n');

      return this.reply({ raw: true, socket: this.connector.socket }, message);
    })
    .then(() => this.reply(226))
    .catch((err) => {
      if (err && err.name === 'TimeoutError') {
        log.error(err);
        return this.reply(425, 'No connection established');
      }
      if (err && err.name === 'ConnectorError') {
        log.error(err);
        return this.reply(425, 'Use PASV or PORT to establish data connection first');
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
  description: 'Returns standardized machine-readable directory listing',
  flags: {
    feat: 'MLSD'
  }
};
