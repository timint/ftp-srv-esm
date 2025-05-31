export default {
  directive: ['CWD', 'XCWD'],
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.chdir) return this.reply(402, 'Not supported by file system');

    return Promise.resolve().then(() => this.fs.chdir(command.arg))
    .then((cwd) => {
      const path = cwd ? '"'+ cwd.replace(/"/g, '""') +'"' : '';
      return this.reply(250, `OK. Current directory is ${path}`);
    })
    .catch((err) => {
      log.error(err);
      return this.reply(550, err.message);
    });
  },
  syntax: '{{cmd}} <path>',
  description: 'Change working directory'
};
