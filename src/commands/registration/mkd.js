export default {
  directive: ['MKD', 'XMKD'],
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.mkdir) return this.reply(402, 'Not supported by file system');

    return Promise.resolve().then(() => this.fs.mkdir(command.arg, { recursive: true }))
    .then((dir) => {
      const path = dir ? `"${dir.replace(/"/g, '""')}"` : '';
      return this.reply(257, path);
    })
    .catch((err) => {
      log.error(err);
      return this.reply(550, err.message);
    });
  },
  syntax: '{{cmd}} <path>',
  description: 'Make directory'
};
