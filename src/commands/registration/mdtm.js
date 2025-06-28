export default {
  directive: 'MDTM',
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported by file system');

    return Promise.resolve().then(() => this.fs.get(command.arg))
    .then((fileStat) => {
      const mtime = new Date(fileStat.mtime);
      const pad = (n, z = 2) => String(n).padStart(z, '0');
      const modificationTime =
        mtime.getUTCFullYear() +
        pad(mtime.getUTCMonth() + 1) +
        pad(mtime.getUTCDate()) +
        pad(mtime.getUTCHours()) +
        pad(mtime.getUTCMinutes()) +
        pad(mtime.getUTCSeconds()) +
        '.' + pad(mtime.getUTCMilliseconds(), 3);
      return this.reply(213, modificationTime);
    })
    .catch((err) => {
      log.error(err);
      return this.reply(550, err.message);
    });
  },
  syntax: '{{cmd}} <path>',
  description: 'Return the last-modified time of a specified file',
  flags: {
    feat: 'MDTM'
  }
};
