export default {
  directive: 'RNTO',
  handler: function ({log, command} = {}) {
    if (!this.renameFrom) return this.reply(503);

    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.rename) return this.reply(402, 'Not supported by file system');

    const from = this.renameFrom;
    const to = command.arg;

    return Promise.resolve().then(() => this.fs.rename(from, to))
    .then(() => {
      return this.reply(250);
    })
    .then(() => this.emit('RNTO', null, to))
    .catch((err) => {
      log.error(err);
      this.emit('RNTO', err);
      return this.reply(550, err.message);
    })
    .then(() => {
      delete this.renameFrom;
    });
  },
  syntax: '{{cmd}} <name>',
  description: 'Rename to'
};
