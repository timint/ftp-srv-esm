import winston from 'winston';
import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/cdup.js';

const CMD = 'CDUP';
let log = winston.createLogger({
  name: CMD,
  format: winston.format.simple(),
  transports: [new winston.transports.Console({ level: 'silly' })]
});
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve(),
    fs: {
      chdir: () => Promise.resolve()
    }
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.spy(mockClient, 'reply');
    sandbox.spy(mockClient.fs, 'chdir');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('.. // successful', () => {
    return cmdFn({log, command: {directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(250);
      expect(mockClient.fs.chdir.args[0][0]).to.equal('..');
    });
  });
});
