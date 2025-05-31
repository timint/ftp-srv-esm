import { expect } from 'chai';
import sinon from 'sinon';
import _cmd from '../../../src/commands/registration/quit.js';

const CMD = 'QUIT';
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    close: () => {}
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(mockClient, 'close').resolves();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('// successful', () => {
    return cmdFn()
    .then(() => {
      expect(mockClient.close.callCount).to.equal(1);
    });
  });
});
