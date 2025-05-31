import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
import errors from '../errors.js';

const FORMATS = {
  ls,
  ep
};

export default function fileStat(fileStat, format = 'ls') {
  if (typeof format === 'function') return format(fileStat);
  if (!Object.prototype.hasOwnProperty.call(FORMATS, format)) {
    throw new errors.FileSystemError('Bad file stat formatter');
  }
  return FORMATS[format](fileStat);
};

function ls(fileStat) {
  const now = dayjs.utc();
  const mtime = dayjs.utc(new Date(fileStat.mtime));
  const timeDiff = now.diff(mtime, 'month');
  const dateFormat = timeDiff < 6 ? 'MMM DD HH:mm' : 'MMM DD  YYYY';

  return [
    fileStat.mode ? [
      fileStat.isDirectory() ? 'd' : '-',
      fileStat.mode & 256 ? 'r' : '-',
      fileStat.mode & 128 ? 'w' : '-',
      fileStat.mode & 64 ? 'x' : '-',
      fileStat.mode & 32 ? 'r' : '-',
      fileStat.mode & 16 ? 'w' : '-',
      fileStat.mode & 8 ? 'x' : '-',
      fileStat.mode & 4 ? 'r' : '-',
      fileStat.mode & 2 ? 'w' : '-',
      fileStat.mode & 1 ? 'x' : '-'
    ].join('') : fileStat.isDirectory() ? 'drwxr-xr-x' : '-rwxr-xr-x',
    '1',
    fileStat.uid !== undefined ? fileStat.uid : 1,
    fileStat.gid !== undefined ? fileStat.gid : 1,
    fileStat.size !== undefined ? String(fileStat.size).padStart(12) : '            ',
    String(mtime.format(dateFormat)).padStart(12),
    fileStat.name
  ].join(' ');
}

function ep(fileStat) {
  const facts = [
    fileStat.dev && fileStat.ino ? `i${fileStat.dev.toString(16)}.${fileStat.ino.toString(16)}` : null,
    fileStat.size ? `s${fileStat.size}` : null,
    fileStat.mtime ? `m${dayjs.utc(new Date(fileStat.mtime)).format('X')}` : null,
    fileStat.mode ? `up${(fileStat.mode & 4095).toString(8)}` : null,
    fileStat.isDirectory() ? '/' : 'r'
  ].filter(Boolean).join(',');
  return `+${facts}\t${fileStat.name}`;
}
