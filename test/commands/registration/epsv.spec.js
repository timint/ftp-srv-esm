import { expect } from 'chai';
import sinon from 'sinon';
import PassiveConnector from '../../../src/connector/passive.js';
import _cmd from '../../../src/commands/registration/epsv.js';

const CMD = 'EPSV';
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve()
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(mockClient, 'reply').resolves();
    sandbox.stub(PassiveConnector.prototype, 'setupServer').resolves({
      address: () => ({port: 12345})
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('// successful IPv4', () => {
    return cmdFn({})
    .then(() => {
      const [code, message] = mockClient.reply.args[0];
      expect(code).to.equal(229);
      expect(message).to.equal('EPSV OK (|||12345|)');
    });
  });
});
