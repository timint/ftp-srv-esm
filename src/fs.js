import nodePath from 'path';
import { randomBytes } from 'crypto';
import { accessSync, chmodSync, createReadStream, createWriteStream, constants, mkdirSync, readdirSync, renameSync, rmdirSync, statSync, unlinkSync } from 'fs';
import errors from './errors.js';

class FileSystem {
  constructor(connection, {root, cwd} = {}) {
    this.connection = connection;
    this.cwd = nodePath.normalize(cwd || '/').replace(/[/\\]+/g, '/');
    let rootPath = root || process.cwd();
    if (nodePath.isAbsolute(rootPath)) {
      this._root = nodePath.normalize(rootPath);
    } else {
      this._root = nodePath.resolve(rootPath);
    }
  }

  get root() {
    return this._root;
  }

  _resolvePath(dir = '.') {
    // Use node's path module for normalization
    const normalizedPath = nodePath.normalize(dir).replace(/[/\\]+/g, '/');

    // Join cwd with new path
    let clientPath = nodePath.isAbsolute(normalizedPath)
      ? normalizedPath
      : nodePath.join(this.cwd, normalizedPath).replace(/[/\\]+/g, '/');

    // Ensure clientPath starts with a leading slash
    if (!clientPath.startsWith('/')) {
      clientPath = '/' + clientPath;
    }

    // Prevent escaping root: clamp to '/'
    const segments = clientPath.split('/').filter(Boolean);
    let safeSegments = [];
    for (const seg of segments) {
      if (seg === '..') {
        if (safeSegments.length > 0) safeSegments.pop();
      } else if (seg !== '.') {
        safeSegments.push(seg);
      }
    }
    clientPath = '/' + safeSegments.join('/');

    // For fsPath, join root with clientPath, but avoid double-absolute path on Windows
    let fsPath = nodePath.join(this._root, clientPath.slice(1));

    // Convert fsPath to use forward slashes
    fsPath = fsPath.replace(/\\/g, '/');

    return {
      clientPath,
      fsPath
    };
  }

  currentDirectory() {
    return this.cwd;
  }

  chdir(path = '.') {
    const {clientPath, fsPath} = this._resolvePath(path);
    const statObj = statSync(fsPath);
    if (!statObj.isDirectory()) throw new errors.FileSystemError('Not a valid directory');
    this.cwd = clientPath;
    return this.currentDirectory();
  }

  list(path = '.') {
    const {fsPath} = this._resolvePath(path);
    const fileNames = readdirSync(fsPath);
    const results = fileNames.map((fileName) => {
      const filePath = nodePath.join(fsPath, fileName);
      try {
        accessSync(filePath, constants.F_OK);
        const statObj = statSync(filePath);
        statObj.name = fileName;
        return statObj;
      } catch {
        return null;
      }
    });
    return results.filter(Boolean);
  }

  get(fileName) {
    const {fsPath} = this._resolvePath(fileName);
    const statObj = statSync(fsPath);
    statObj.name = fileName;
    return statObj;
  }

  write(fileName, {append = false, start = undefined} = {}) {
    const {fsPath, clientPath} = this._resolvePath(fileName);
    const stream = createWriteStream(fsPath, {flags: !append ? 'w+' : 'a+', start});
    stream.once('error', async () => {
      try {
        unlinkSync(fsPath);
      } catch { /* ignore error */ }
    });
    stream.once('close', () => stream.end());
    return {
      stream,
      clientPath
    };
  }

  read(fileName, {start = undefined} = {}) {
    const {clientPath, fsPath} = this._resolvePath(fileName);
    if (statSync(fsPath).isDirectory()) {
      throw new errors.FileSystemError('Cannot read a directory');
    }
    const stream = createReadStream(fsPath, {flags: 'r', start});
    return {
      stream,
      clientPath
    };
  }

  delete(path) {
    const {fsPath} = this._resolvePath(path);
    const statObj = statSync(fsPath);
    if (statObj.isDirectory()) return rmdirSync(fsPath);
    else return unlinkSync(fsPath);
  }

  mkdir(path) {
    const {fsPath} = this._resolvePath(path);
    mkdirSync(fsPath, { recursive: true });
    return fsPath;
  }

  rename(from, to) {
    const {fsPath: fromPath} = this._resolvePath(from);
    const {fsPath: toPath} = this._resolvePath(to);
    return renameSync(fromPath, toPath);
  }

  chmod(path, mode) {
    const {fsPath} = this._resolvePath(path);
    return chmodSync(fsPath, mode);
  }

  getUniqueName() {
    const randomPart = randomBytes(8).toString('hex');
    const timestampPart = Date.now().toString(36);
    return `${timestampPart}-${randomPart}`;
  }
}

export default FileSystem;
