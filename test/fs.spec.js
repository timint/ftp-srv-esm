import { expect } from 'chai';
import FileSystem from '../src/fs.js';
import errors from '../src/errors.js';

describe('FileSystem', function () {
  let fs;

  before(function () {
    fs = new FileSystem({}, {
      root: '/tmp/ftp-srv-esm',
      cwd: 'file/1/2/3'
    });
  });

  describe('File System extending', function () {
    class FileSystemOV extends FileSystem {
      chdir() {
        throw new errors.FileSystemError('Not a valid directory');
      }
    }
    let ovFs;
    before(function () {
      ovFs = new FileSystemOV({});
    });

    it('Handles an error', function () {
      return Promise.resolve().then(() => ovFs.chdir())
      .catch((err) => {
        expect(err).to.be.instanceof(errors.FileSystemError);
      });
    });
  });

  describe('Resolves paths correctly', function () {
    it('Gets correct relative path', function () {
      const result = fs._resolvePath('.');
      expect(result).to.be.an('object');
      expect(result).to.have.property('clientPath');
      expect(result).to.have.property('fsPath');
      expect(result.clientPath).to.equal('/file/1/2/3');
      expect(result.fsPath).to.equal('/tmp/ftp-srv-esm/file/1/2/3');
    });

    it('Gets correct relative path', function () {
      const result = fs._resolvePath('..');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal('/file/1/2');
      expect(result.fsPath).to.equal('/tmp/ftp-srv-esm/file/1/2');
    });

    it('Gets correct relative path', function () {
      const result = fs._resolvePath('other');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal('/file/1/2/3/other');
      expect(result.fsPath).to.equal('/tmp/ftp-srv-esm/file/1/2/3/other');
    });

    it('Gets correct absolute path', function () {
      const result = fs._resolvePath('/other');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal('/other');
      expect(result.fsPath).to.equal('/tmp/ftp-srv-esm/other');
    });

    it('Doesn\'t escape root (Unix directory separators)', function () {
      const result = fs._resolvePath('../../../../../../../../../../..');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal('/');
      expect(result.fsPath).to.equal('/tmp/ftp-srv-esm');
    });

    it('Doesn\'t escape root (Windows directory separators)', function () {
      const result = fs._resolvePath('.\\..\\..\\..\\..\\..\\..\\');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal('/');
      expect(result.fsPath).to.equal('/tmp/ftp-srv-esm');
    });

    it('Doesn\'t escape root (with backslash prefix)', function () {
      const result = fs._resolvePath('\\/../../../../../../');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal('/');
      expect(result.fsPath).to.equal('/tmp/ftp-srv-esm');
    });

    it('Resolves to correct filesystem file', function () {
      const result = fs._resolvePath('/cool/file.txt');
      expect(result).to.be.an('object');
      expect(result.clientPath).to.equal('/cool/file.txt');
      expect(result.fsPath).to.equal('/tmp/ftp-srv-esm/cool/file.txt');
    });
  });
});
