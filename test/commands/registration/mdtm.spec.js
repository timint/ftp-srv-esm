import winston from 'winston';
import sinon from 'sinon';
import { expect } from 'chai';
import _cmd from '../../../src/commands/registration/mdtm.js';

const CMD = 'MDTM';
let log = winston.createLogger({
  name: CMD,
  format: winston.format.simple(),
  transports: [new winston.transports.Console({ level: 'silly' })]
});
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => {},
    fs: {get: () => {}}
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sandbox = sinon.createSandbox();

    sandbox.stub(mockClient, 'reply').resolves();
    sandbox.stub(mockClient.fs, 'get').resolves({mtime: 'Mon, 10 Oct 2011 23:24:11 GMT'});
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

    it('fails on no fs get command', () => {
      const badMockClient = {reply: () => {}, fs: {}};
      const badCmdFn = _cmd.handler.bind(badMockClient);
      sandbox.stub(badMockClient, 'reply').resolves();

      return badCmdFn()
      .then(() => {
        expect(badMockClient.reply.args[0][0]).to.equal(402);
      });
    });
  });

  it('. // successful', () => {
    return cmdFn({log, command: {directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(213);
      //expect(mockClient.reply.args[0][1]).to.equal('20111010172411.000');
    });
  });

  it('. // unsuccessful', () => {
    mockClient.fs.get.restore();
    sandbox.stub(mockClient.fs, 'get').rejects(new Error());

    return cmdFn({log, command: {directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(550);
    });
  });
});
