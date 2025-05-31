import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/help.js';

const CMD = 'HELP';
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve()
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.spy(mockClient, 'reply');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('// successful', () => {
    return cmdFn({command: {directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(211);
    });
  });

  it('help // successful', () => {
    return cmdFn({command: {arg: 'help', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(214);
    });
  });

  it('allo // successful', () => {
    return cmdFn({command: {arg: 'allo', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(214);
    });
  });

  it('bad // unsuccessful', () => {
    return cmdFn({command: {arg: 'bad', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(502);
    });
  });
});
