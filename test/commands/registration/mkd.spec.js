import winston from 'winston';
import sinon from 'sinon';
import { expect } from 'chai';
import _cmd from '../../../src/commands/registration/mkd.js';

const CMD = 'MKD';
let log = winston.createLogger({
  name: CMD,
  format: winston.format.simple(),
  transports: [new winston.transports.Console({ level: 'silly' })]
});
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => {},
    fs: {mkdir: () => {}}
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sandbox = sinon.createSandbox();
    sandbox.stub(mockClient, 'reply').resolves();
    sandbox.stub(mockClient.fs, 'mkdir').resolves();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('// check', function () {
    it('fails on no fs', () => {
      const badMockClient = {reply: () => {}};
      const badCmdFn = _cmd.handler.bind(badMockClient);
      sandbox.stub(badMockClient, 'reply').resolves();

      return badCmdFn()
      .then(() => {
        expect(badMockClient.reply.args[0][0]).to.equal(550);
      });
    });

    it('fails on no fs mkdir command', () => {
      const badMockClient = {reply: () => {}, fs: {}};
      const badCmdFn = _cmd.handler.bind(badMockClient);
      sandbox.stub(badMockClient, 'reply').resolves();

      return badCmdFn()
      .then(() => {
        expect(badMockClient.reply.args[0][0]).to.equal(402);
      });
    });
  });

  it('test // successful', () => {
    return cmdFn({log, command: {arg: 'test', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(257);
      expect(mockClient.fs.mkdir.args[0][0]).to.equal('test');
    });
  });

  it('test // successful', () => {
    mockClient.fs.mkdir.restore();
    sandbox.stub(mockClient.fs, 'mkdir').resolves('test');

    return cmdFn({log, command: {arg: 'test', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(257);
      expect(mockClient.fs.mkdir.args[0][0]).to.equal('test');
    });
  });

  it('bad // unsuccessful', () => {
    mockClient.fs.mkdir.restore();
    sandbox.stub(mockClient.fs, 'mkdir').rejects(new Error('Bad'));

    return cmdFn({log, command: {arg: 'bad', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(550);
      expect(mockClient.fs.mkdir.args[0][0]).to.equal('bad');
    });
  });
});
