import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/auth.js';

const CMD = 'AUTH';
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve(),
    server: {
      options: {
        tls: {}
      }
    }
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.spy(mockClient, 'reply');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('TLS // supported', () => {
    return cmdFn({command: {arg: 'TLS', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(234);
      expect(mockClient.secure).to.equal(true);
    });
  });

  it('SSL // not supported', () => {
    return cmdFn({command: {arg: 'SSL', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(504);
    });
  });

  it('bad // bad', () => {
    return cmdFn({command: {arg: 'bad', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(504);
    });
  });
});
