import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/mode.js';

const CMD = 'MODE';
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

  it('S // successful', () => {
    return cmdFn({command: {arg: 'S'}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(200);
    });
  });

  it('Q // unsuccessful', () => {
    return cmdFn({command: {arg: 'Q'}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(504);
    });
  });
});
