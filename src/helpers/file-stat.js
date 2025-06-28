import errors from '../errors.js';

const FORMATS = {
  ls,
  ep,
  mlsd
};

export default function fileStat(fileStat, format = 'ls') {
  if (typeof format === 'function') return format(fileStat);
  if (!Object.prototype.hasOwnProperty.call(FORMATS, format)) {
    throw new errors.FileSystemError('Bad file stat formatter');
  }
  return FORMATS[format](fileStat);
};

function ls(fileStat) {
  const now = new Date();
  const mtime = new Date(fileStat.mtime);
  const timeDiff = Math.floor((now - mtime) / (1000 * 60 * 60 * 24 * 30)); // months

  // Format date - if older than 6 months, show year; otherwise show time
  let dateStr;
  if (timeDiff < 6) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[mtime.getMonth()];
    const day = String(mtime.getDate()).padStart(2, ' ');
    const hours = String(mtime.getHours()).padStart(2, '0');
    const minutes = String(mtime.getMinutes()).padStart(2, '0');
    dateStr = `${month} ${day} ${hours}:${minutes}`;
  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[mtime.getMonth()];
    const day = String(mtime.getDate()).padStart(2, ' ');
    const year = mtime.getFullYear();
    dateStr = `${month} ${day}  ${year}`;
  }

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
    String(dateStr).padStart(12),
    fileStat.name
  ].join(' ');
}

function ep(fileStat) {
  const facts = [
    fileStat.dev && fileStat.ino ? `i${fileStat.dev.toString(16)}.${fileStat.ino.toString(16)}` : null,
    fileStat.size ? `s${fileStat.size}` : null,
    fileStat.mtime ? `m${Math.floor(new Date(fileStat.mtime).getTime() / 1000)}` : null,
    fileStat.mode ? `up${(fileStat.mode & 4095).toString(8)}` : null,
    fileStat.isDirectory() ? '/' : 'r'
  ].filter(Boolean).join(',');
  return `+${facts}\t${fileStat.name}`;
}

function mlsd(fileStat) {
  // RFC 3659 MLSD format: facts separated by semicolon, followed by space and filename
  const facts = [];

  // Type fact (required)
  if (fileStat.isDirectory()) {
    facts.push('type=dir');
  } else {
    facts.push('type=file');
  }

  // Size fact
  if (fileStat.size !== undefined) {
    facts.push(`size=${fileStat.size}`);
  }

  // Modify fact (modification time)
  if (fileStat.mtime) {
    const mtime = new Date(fileStat.mtime);
    const pad = (n, z = 2) => String(n).padStart(z, '0');
    const timeStr =
      mtime.getUTCFullYear() +
      pad(mtime.getUTCMonth() + 1) +
      pad(mtime.getUTCDate()) +
      pad(mtime.getUTCHours()) +
      pad(mtime.getUTCMinutes()) +
      pad(mtime.getUTCSeconds()) +
      '.' + pad(mtime.getUTCMilliseconds(), 3);
    facts.push(`modify=${timeStr}`);
  }

  // Perm fact (permissions)
  if (fileStat.mode !== undefined) {
    const perms = [];
    if (fileStat.isDirectory()) {
      if (fileStat.mode & 256) perms.push('e'); // enter
      if (fileStat.mode & 128) perms.push('c'); // create
      if (fileStat.mode & 64) perms.push('d'); // delete
      perms.push('l'); // list (always allowed for directories we can read)
    } else {
      if (fileStat.mode & 256) perms.push('r'); // read
      if (fileStat.mode & 128) perms.push('w'); // write
      if (fileStat.mode & 64) perms.push('a'); // append
    }
    if (perms.length > 0) {
      facts.push(`perm=${perms.join('')}`);
    }
  }

  return `${facts.join(';')}; ${fileStat.name}`;
}
