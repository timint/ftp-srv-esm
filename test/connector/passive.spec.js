import { expect } from 'chai';
import sinon from 'sinon';
import net from 'net';
import winston from 'winston';
import PassiveConnector from '../../src/connector/passive.js';
import { getNextPortFactory } from '../../src/helpers/find-port.js';

describe.skip('Connector - Passive Mode //', function () {
  const host = '127.0.0.1';
  let mockConnection = {
    reply: () => Promise.resolve({}),
    close: () => Promise.resolve({}),
    encoding: 'utf8',
    log: winston.createLogger({
      name: 'passive-test',
      format: winston.format.simple(),
      transports: [new winston.transports.Console({ level: 'silly' })]
    }),
    commandSocket: {
      remoteAddress: '::ffff:127.0.0.1'
    },
    server: {
      url: '',
      getNextPasvPort: getNextPortFactory(host, 1024)
    }
  };
  let sandbox;

  before(() => {
    sandbox = sinon.createSandbox();
  });

  beforeEach(() => {
    sandbox.spy(mockConnection, 'reply');
    sandbox.spy(mockConnection, 'close');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('Cannot wait for connection with no server', function (done) {
    let passive = new PassiveConnector(mockConnection);
    passive.waitForConnection()
    .catch((err) => {
      expect(err.name).to.equal('ConnectorError');
      done();
    });
  });

  describe('setup', function () {
    before(function () {
      sandbox.stub(mockConnection.server, 'getNextPasvPort').value(getNextPortFactory(host));
    });

    it('No PASV range provided', function (done) {
      let passive = new PassiveConnector(mockConnection);
      passive.setupServer()
      .catch((err) => {
        try {
          expect(err.name).to.contain('RangeError');
          done();
        } catch (ex) {
          done(ex);
        }
      });
    });
  });

  describe('Setup', function () {
    let connection;
    before(function () {
      sandbox.stub(mockConnection.server, 'getNextPasvPort').value(getNextPortFactory(host, -1, -1));

      connection = new PassiveConnector(mockConnection);
    });

    it('Has invalid PASV range', function (done) {
      connection.setupServer()
      .catch((err) => {
        expect(err.name).to.contain('RangeError');
        done();
      });
    });
  });

  it('Sets up a server', function () {
    let passive = new PassiveConnector(mockConnection);
    return passive.setupServer()
    .then(() => {
      expect(passive.dataServer).to.exist;
      return passive.end();
    });
  });

  describe('Setup', function () {
    let passive;
    let closeFnSpy;
    beforeEach(function () {
      passive = new PassiveConnector(mockConnection);
      return passive.setupServer()
      .then(() => {
        closeFnSpy = sandbox.spy(passive.dataServer, 'close');
      });
    });
    afterEach(function () {
      return passive.end();
    });

    it('Destroys existing server, then sets up a server', function () {
      return passive.setupServer()
      .then(() => {
        expect(closeFnSpy.callCount).to.equal(1);
        expect(passive.dataServer).to.exist;
      });
    });
  });

  it('Refuses connection with different remote address', function (done) {
    sandbox.stub(mockConnection.commandSocket, 'remoteAddress').value('bad');

    let passive = new PassiveConnector(mockConnection);
    passive.setupServer()
    .then(() => {
      expect(passive.dataServer).to.exist;

      const {port} = passive.dataServer.address();
      net.createConnection(port);
      passive.dataServer.once('connection', () => {
        setTimeout(() => {
          expect(passive.connection.reply.callCount).to.equal(1);
          expect(passive.connection.reply.args[0][0]).to.equal(550);

          passive.end();
          done();
        }, 100);
      });
    })
    .catch(done);
  });

  it('Accepts connection', (done) => {
    let passive = new PassiveConnector(mockConnection);
    return passive.setupServer()
    .then(() => {
      expect(passive.dataServer).to.exist;

      const {port} = passive.dataServer.address();
      net.createConnection(port);
      return passive.waitForConnection();
    })
    .then(() => {
      expect(passive.dataSocket).to.exist;
      passive.end();
    });
  });
});
