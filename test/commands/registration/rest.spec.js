import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/rest.js';

const CMD = 'REST';
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

  it('// unsuccessful', () => {
    return cmdFn()
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(501);
    });
  });

  it('-1 // unsuccessful', () => {
    return cmdFn({command: {arg: '-1', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(501);
    });
  });

  it('bad // unsuccessful', () => {
    return cmdFn({command: {arg: 'bad', directive: CMD}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(501);
    });
  });

  it('1 // successful', () => {
    return cmdFn({command: {arg: '1', directive: CMD}})
    .then(() => {
      expect(mockClient.restByteCount).to.equal(1);
      expect(mockClient.reply.args[0][0]).to.equal(350);
    });
  });

  it('0 // successful', () => {
    return cmdFn({command: {arg: '0', directive: CMD}})
    .then(() => {
      expect(mockClient.restByteCount).to.equal(0);
      expect(mockClient.reply.args[0][0]).to.equal(350);
    });
  });
});
