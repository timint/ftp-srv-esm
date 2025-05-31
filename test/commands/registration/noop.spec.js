import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/noop.js';

const CMD = 'NOOP';
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve()
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sandbox = sinon.createSandbox();
    sandbox.spy(mockClient, 'reply');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('// successful', () => {
    return cmdFn()
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(200);
    });
  });
});
