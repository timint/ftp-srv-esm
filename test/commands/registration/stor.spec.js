import { expect } from 'chai';
import sinon from 'sinon';
import winston from 'winston';
import EventEmitter from 'events';
import errors from '../../../src/errors.js';
import _cmd from '../../../src/commands/registration/stor.js';

const CMD = 'STOR';
let log = winston.createLogger({
  name: CMD,
  format: winston.format.simple(),
  transports: [new winston.transports.Console({ level: 'silly' })]
});
describe(CMD, function () {
  let sandbox;
  let emitter;
  const mockClient = {
    commandSocket: {
      pause: () => {},
      resume: () => {}
    },
    reply: () => Promise.resolve(),
    connector: {
      waitForConnection: () => Promise.resolve({
        resume: () => {}
      }),
      end: () => Promise.resolve({})
    }
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    mockClient.fs = {
      write: () => {}
    };

    emitter = new EventEmitter();
    mockClient.emit = emitter.emit.bind(emitter);
    mockClient.on = emitter.on.bind(emitter);
    mockClient.once = emitter.once.bind(emitter);

    sandbox.spy(mockClient, 'reply');
  });
  afterEach(() => sandbox.restore());

  it('// unsuccessful | no file system', () => {
    delete mockClient.fs;

    return cmdFn()
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(550);
    });
  });

  it('// unsuccessful | file system does not have functions', () => {
    mockClient.fs = {};

    return cmdFn()
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(402);
    });
  });

  it('// unsuccessful | connector times out', () => {
    sandbox.stub(mockClient.connector, 'waitForConnection').callsFake(function () {
      return Promise.reject(new errors.TimeoutError('Timeout'));
    });

    return cmdFn({log, command: {arg: 'test.txt'}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(425);
    });
  });

  it('// unsuccessful | connector errors out', () => {
    sandbox.stub(mockClient.connector, 'waitForConnection').callsFake(function () {
      return Promise.reject(new Error('test'));
    });

    return cmdFn({log, command: {arg: 'test.txt'}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(550);
    });
  });

  it('// unsuccessful | emits error event', () => {
    sandbox.stub(mockClient.connector, 'waitForConnection').callsFake(function () {
      return Promise.reject(new Error('test'));
    });

    let errorEmitted = false;
    emitter.once('STOR', (err) => {
      errorEmitted = !!err;
    });

    return cmdFn({log, command: {arg: 'test.txt'}})
    .then(() => {
      expect(errorEmitted).to.equal(true);
    });
  });
});
