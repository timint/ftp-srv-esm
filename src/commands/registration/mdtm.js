import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

export default {
  directive: 'MDTM',
  handler: function ({log, command} = {}) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported by file system');

    return Promise.resolve().then(() => this.fs.get(command.arg))
    .then((fileStat) => {
      const modificationTime = dayjs.utc(fileStat.mtime).format('YYYYMMDDHHmmss.SSS');
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
