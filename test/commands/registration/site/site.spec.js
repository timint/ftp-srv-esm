import { expect } from 'chai';
import sinon from 'sinon';
import winston from 'winston';

import siteRegistry from '../../../../src/commands/registration/site/registry.js';
import FtpCommands from '../../../../src/commands/index.js';
import _cmd from '../../../../src/commands/registration/site/index.js';

const CMD = 'SITE';
const log = winston.createLogger({
  name: 'site-test',
  format: winston.format.simple(),
  transports: [new winston.transports.Console({ level: 'silly' })]
});
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve(),
    commands: new FtpCommands()
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(mockClient, 'reply').resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('// unsuccessful', () => {
    return cmdFn({log})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(502);
    });
  });

  it('// unsuccessful', () => {
    return cmdFn({log, command: {arg: 'BAD'}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(502);
    });
  });

  it('// successful', () => {
    sandbox.stub(siteRegistry.CHMOD, 'handler').resolves();

    return cmdFn({log, command: {arg: 'CHMOD test'}})
    .then(() => {
      const {command} = siteRegistry.CHMOD.handler.args[0][0];
      expect(command.directive).to.equal('CHMOD');
      expect(command.arg).to.equal('test');
    });
  });
});
