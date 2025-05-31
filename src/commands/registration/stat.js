import getFileStat from '../../helpers/file-stat.js';

export default {
  directive: 'STAT',
  handler: function (args = {}) {
    const {log, command} = args;
    const path = command?.arg;
    if (path) {
      if (!this.fs) return this.reply(550, 'File system not instantiated');
      if (!this.fs.get) return this.reply(402, 'Not supported by file system');

      return Promise.resolve().then(() => this.fs.get(path))
      .then((stat) => {
        if (stat.isDirectory()) {
          if (!this.fs.list) return this.reply(402, 'Not supported by file system');

          return Promise.resolve().then(() => this.fs.list(path))
          .then((stats) => [213, stats]);
        }
        return [212, [stat]];
      })
      .then(([code, fileStats]) => {
        return Promise.all(fileStats.map((file) => {
          const message = getFileStat(file, this?.server?.options?.list_format || 'ls');
          return {
            raw: true,
            message
          };
        }))
        .then((messages) => [code, messages]);
      })
      .then(([code, messages]) => this.reply(code, 'Status begin', ...messages, 'Status end'))
      .catch((err) => {
        log.error(err);
        return this.reply(450, err.message);
      });
    } else {
      return this.reply(211, 'Status OK');
    }
  },
  syntax: '{{cmd}} [<path>]',
  description: 'Returns the current status'
};
