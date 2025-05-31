import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/feat.js';

const CMD = 'FEAT';
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve()
  };
  // Use _cmd.handler for cmdFn
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
      expect(mockClient.reply.args[0][2].message).to.equal(' AUTH TLS');
    });
  });
});
