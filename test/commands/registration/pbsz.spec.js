import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/pbsz.js';

const CMD = 'PBSZ';
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve(),
    server: {}
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sandbox = sinon.createSandbox();

    sandbox.spy(mockClient, 'reply');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('// unsuccessful', () => {
    return cmdFn()
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(202);
    });
  });

  it('// successful', () => {
    mockClient.secure = true;
    mockClient.server._tls = {};

    return cmdFn({command: {arg: '0'}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(200);
      expect(mockClient.bufferSize).to.equal(0);
    });
  });

  it('// successful', () => {
    mockClient.secure = true;
    mockClient.server._tls = {};

    return cmdFn({command: {arg: '10'}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(200);
      expect(mockClient.bufferSize).to.equal(10);
    });
  });
});
