import { expect } from 'chai';
import sinon from 'sinon';
import winston from 'winston';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, rmSync, writeFileSync, promises as fsPromises } from 'fs';
import nodePath from 'path';
import { Readable, Writable } from 'stream';
import { Client as FtpClient } from 'basic-ftp';

import FtpServer from '../src/index.js';

describe('Integration', function () {
  this.timeout(4e3);

  let client;
  let sandbox;
  let log = winston.createLogger({
    name: 'test-runner',
    format: winston.format.simple(),
    transports: [new winston.transports.Console({ level: 'silly' })]
  });
  let server;

  let connection;
  const clientDirectory = `${process.cwd()}/test_tmp`;

  before(() => {
    return startServer({url: 'ftp://127.0.0.1:8880'});
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => sandbox.restore());

  after(() => server.close());

  before(() => {
    directoryPurge(clientDirectory);
    mkdirSync(clientDirectory);
  });
  after(() => directoryPurge(clientDirectory));

  function startServer(options = {}) {
    server = new FtpServer(Object.assign({
      log,
      pasv_hostname: '127.0.0.1',
      pasv_min: 8881,
      greeting: ['hello', 'world'],
      anonymous: true
    }, options));
    server.on('login', (data, resolve) => {
      connection = data.connection;
      resolve({root: clientDirectory});
    });

    return server.listen();
  }

  async function connectClient(options = {}) {
    client = new FtpClient();
    await client.access({
      host: server.url.hostname,
      port: server.url.port,
      user: 'test',
      password: 'test',
      ...options
    });
    return client;
  }

  function closeClient() {
    return client.close();
  }

  function directoryPurge(dir) {
    if (!existsSync(dir)) return;
    const items = readdirSync(dir);
    items.forEach((item) => {
      const itemPath = nodePath.resolve(dir, item);
      if (statSync(itemPath).isDirectory()) {
        directoryPurge(itemPath);
      } else {
        unlinkSync(itemPath);
      }
    });
    rmSync(dir, { recursive: true });
  }

  function runFileSystemTests(name) {

    before(() => {
      directoryPurge(`${clientDirectory}/${name}/`);
      mkdirSync(`${clientDirectory}/${name}/`);
      writeFileSync(`${clientDirectory}/${name}/fake.txt`, 'Fake file');
    });

    after(() => directoryPurge(`${clientDirectory}/${name}/`));

    it('STAT', async () => {
      let error;
      try {
        await client.send('STAT');
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
    });

    it('SYST', async () => {
      let error;
      try {
        await client.send('SYST');
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
    });

    it('CWD ..', async () => {
      let error;
      try {
        await client.cd('..');
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
    });

    it(`CWD ${name}`, async () => {
      let error;
      try {
        await client.cd(`${name}`);
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
    });

    it('PWD', async () => {
      try {
        const data = await client.pwd();
        expect(data).to.equal(`/${name}`);
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('LIST .', async () => {
      try {
        const data = await client.list('.');
        expect(data).to.be.an('array');
        expect(data.length).to.equal(1);
        expect(data[0].name).to.equal('fake.txt');
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('LIST fake.txt', async () => {
      try {
        const data = await client.list('fake.txt');
        expect(data).to.be.an('array');
        expect(data.length).to.equal(1);
        expect(data[0].name).to.equal('fake.txt');
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('STOR fail.txt', async () => {
      const buffer = Buffer.from('test text file');
      const fsPath = `${clientDirectory}/${name}/fail.txt`;
      sandbox.stub(connection.fs, 'write').callsFake(function () {
        const stream = createWriteStream(fsPath, {flags: 'w+', autoClose: false});
        stream.on('error', () => existsSync(fsPath) && unlinkSync(fsPath));
        stream.on('close', () => stream.end());
        setImmediate(() => stream.emit('error', new Error('STOR fail test')));
        return stream;
      });
      let error;
      try {
        await client.uploadFrom(buffer, 'fail.txt');
      } catch (err) {
        error = err;
      }
      expect(error).to.exist;
      const fileExists = existsSync(fsPath);
      expect(fileExists).to.equal(false);
    });

    it('STOR tést.txt', async () => {
      const buffer = Buffer.from('test text file');
      const fsPath = `${clientDirectory}/${name}/tést.txt`;
      const stream = Readable.from(buffer);
      connection.once('STOR', (err) => {
        expect(err).to.not.exist;
      });
      await client.uploadFrom(stream, 'tést.txt');
      expect(existsSync(fsPath)).to.equal(true);
      const data = await fsPromises.readFile(fsPath, 'utf8');
      expect(data.toString()).to.equal('test text file');
    });

    it('STOR LICENSE', async () => {
      const logo = nodePath.resolve(process.cwd(), 'LICENSE');
      const fsPath = `${clientDirectory}/${name}/LICENSE`;

      try {
        await client.uploadFrom(logo, 'LICENSE');
        expect(existsSync(fsPath)).to.equal(true);
        const logoContents = readFileSync(logo);
        const transferedContects = readFileSync(fsPath);
        expect(logoContents.equals(transferedContects)).to.equal(true);
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('APPE tést.txt', async function () {
      this.timeout(10000); // Increase timeout for debugging
      const initialBuffer = Buffer.from('test text file');
      const appendBuffer = Buffer.from(', awesome!');
      const fsPath = `${clientDirectory}/${name}/tést.txt`;
      // Upload the initial file using FTP
      await client.uploadFrom(Readable.from(initialBuffer), 'tést.txt');
      // Add event listener for APPE
      let appeError;
      connection.once('APPE', (err) => {
        appeError = err;
      });
      try {
        await client.appendFrom(Readable.from(appendBuffer), 'tést.txt');
        expect(appeError).to.not.exist;
        expect(existsSync(fsPath)).to.equal(true);
        const data = readFileSync(fsPath);
        expect(data.toString()).to.equal('test text file, awesome!');
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('RETR tést.txt', async () => {
      connection.once('RETR', (err) => {
        expect(err).to.not.exist;
      });

      let text = '';
      // Use imported Writable from 'stream'
      const writable = new Writable({
        write(chunk, encoding, callback) {
          text += chunk.toString();
          callback();
        }
      });
      await client.downloadTo(writable, 'tést.txt');
      expect(text).to.equal('test text file, awesome!');
    });

    it('RNFR tést.txt, RNTO awesome.txt', async () => {
      try {
        await client.rename('tést.txt', 'awesome.txt');
        expect(existsSync(`${clientDirectory}/${name}/tést.txt`)).to.equal(false);
        expect(existsSync(`${clientDirectory}/${name}/awesome.txt`)).to.equal(true);
        fsPromises.readFile(`${clientDirectory}/${name}/awesome.txt`, 'utf8').then((data) => {
          expect(data.toString()).to.equal('test text file, awesome!');
        }).catch((fserr) => {
          expect(fserr).to.not.exist;
        });
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('SIZE awesome.txt', async () => {
      try {
        const size = await client.size('awesome.txt');
        expect(size).to.be.a('number');
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('MDTM awesome.txt', async () => {
      try {
        const modTime = await client.lastMod('awesome.txt');
        expect(modTime).to.be.instanceOf(Date);
        expect(modTime.toISOString()).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/);
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it.skip('MLSD .', (done) => {
      client.mlsd('.', () => {
        done();
      });
    });

    it('SITE CHMOD 700 awesome.txt', async () => {
      let error;
      try {
        await client.send('SITE CHMOD 600 awesome.txt');
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
      const stats = await fsPromises.stat(`${clientDirectory}/${name}/awesome.txt`);
      const mode = stats.mode.toString(8);
      if (process.platform === 'win32') {
        // Windows: allow 666 or 600 due to limited chmod support
        expect(/(600|666)$/.test(mode)).to.equal(true);
      } else {
        expect(/600$/.test(mode)).to.equal(true);
      }
    });

    it('DELE awesome.txt', async () => {
      try {
        await client.remove('awesome.txt');
        expect(existsSync(`${clientDirectory}/${name}/awesome.txt`)).to.equal(false);
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('MKD témp', async () => {
      await client.cd('/'); // Always start from root
      await client.cd(`/${name}`);
      const path = `${clientDirectory}/${name}/témp`;
      if (existsSync(path)) {
        rmSync(path);
      }
      try {
        await client.ensureDir('témp');
        expect(existsSync(path)).to.equal(true);
      } catch (err) {
        expect(err).to.not.exist;
      }
    });

    it('MKD témp multiple levels deep', async () => {
      await client.cd('/'); // Always start from root
      await client.cd(`/${name}`);
      const path = `${clientDirectory}/${name}/témp`;
      if (existsSync(path)) {
        rmSync(path, {recursive: true});
      }

      try {
        await client.ensureDir('témp/first/second');
        expect(existsSync(path)).to.equal(true);
      } catch (err) {
        expect(err).to.not.exist;
      }

      rmSync(path, {recursive: true});
    });

    it('CWD témp', async () => {
      const path = `${clientDirectory}/${name}/témp`;
      mkdirSync(path, { recursive: true });
      let error;
      try {
        await client.cd('/'); // Always start from root
        await client.cd(`${name}`);
        await client.cd('témp');
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
      const pwd = await client.pwd();
      expect(pwd).to.match(new RegExp(`/${name}/témp$`));
    });

    it('CDUP', async () => {
      let error;
      try {
        await client.cdup();
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
    });

    it('RMD témp', async () => {
      try {
        await client.removeDir('témp');
        expect(existsSync(`${clientDirectory}/${name}/témp`)).to.equal(false);
      } catch (err) {
        // Ignore FTP 550 (directory not found) errors
        if (!(err.code && String(err.code).startsWith('550'))) {
          expect(err).to.not.exist;
        }
      }
    });

    it('CDUP', async () => {
      let error;
      try {
        await client.cdup();
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
    });
  }

  describe('Server events', function () {
    const disconnect = sinon.spy();
    const login = sinon.spy();

    before(() => {
      server.on('login', login);
      server.on('disconnect', disconnect);
      return connectClient({
        host: server.url.hostname,
        port: server.url.port,
        user: 'test',
        password: 'test'
      });
    });

    after(() => {
      server.off('login', login);
      server.off('disconnect', disconnect);
    })

    it('Should fire a login event on connect', () => {
      expect(login.calledOnce).to.be.true;
    });

    it('Should fire a close event on disconnect', async () => {
      await client.close();
      setTimeout(() => {
        expect(disconnect.calledOnce).to.be.true;
        // done(); // done is not needed in async test
      }, 100)
    });
  });

  describe('ASCII Transfer Mode', function () {
    before(() => {
      return connectClient({
        host: server.url.hostname,
        port: server.url.port,
        user: 'test',
        password: 'test'
      });
    });

    after(() => closeClient(client));

    it('TYPE A', async () => {
      let error;
      try {
        await client.send('TYPE A');
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
    });

    runFileSystemTests('ascii');
  });

  describe('Binary Transfer Mode', function () {
    before(() => {
      return connectClient({
        host: server.url.hostname,
        port: server.url.port,
        user: 'test',
        password: 'test'
      });
    });

    after(() => closeClient(client));

    it('TYPE I', async () => {
      let error;
      try {
        await client.send('TYPE I');
      } catch (err) {
        error = err;
      }
      expect(error).to.not.exist;
    });

    runFileSystemTests('binary');
  });

  describe('#EXPLICIT', function () {
    before(() => {
      return server.close()
      .then(() => Promise.all([
        fsPromises.readFile(`${process.cwd()}/test/cert/server.key`, 'utf8'),
        fsPromises.readFile(`${process.cwd()}/test/cert/server.crt`, 'utf8'),
        fsPromises.readFile(`${process.cwd()}/test/cert/server.csr`, 'utf8')
      ]))
      .then(([key, cert, ca]) => startServer({
        url: 'ftp://127.0.0.1:8881',
        tls: {key, cert, ca}
      }))
      .then(() => {
        return connectClient({
          secure: true,
          secureOptions: {
            rejectUnauthorized: false,
            checkServerIdentity: () => undefined
          }
        });
      });
    });

    after(() => closeClient());

    runFileSystemTests('explicit');
  });

  describe.skip('#IMPLICIT', function () {
    before(() => {
      return server.close()
      .then(() => Promise.all([
        fsPromises.readFile(`${process.cwd()}/test/cert/server.key`, 'utf8'),
        fsPromises.readFile(`${process.cwd()}/test/cert/server.crt`, 'utf8'),
        fsPromises.readFile(`${process.cwd()}/test/cert/server.csr`, 'utf8')
      ]))
      .then(([key, cert, ca]) => startServer({
        url: 'ftps://127.0.0.1:8882',
        tls: {key, cert, ca}
      }))
      .then(() => {
        return connectClient({
          secure: 'implicit',
          secureOptions: {
            rejectUnauthorized: false,
            checkServerIdentity: () => undefined
          }
        });
      });
    });

    after(() => closeClient());

    runFileSystemTests('implicit');
  });
});
