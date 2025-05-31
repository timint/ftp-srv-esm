import { expect } from 'chai';
import sinon from 'sinon';
import ActiveConnector from '../../../src/connector/active.js';
import _cmd from '../../../src/commands/registration/port.js';

const CMD = 'PORT';
describe(CMD, function () {
  let sandbox;
  const mockClient = {
    reply: () => Promise.resolve()
  };
  const cmdFn = _cmd.handler.bind(mockClient);

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.spy(mockClient, 'reply');
    sandbox.stub(ActiveConnector.prototype, 'setupConnection').resolves();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('// unsuccessful | no argument', () => {
    return cmdFn()
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(425);
    });
  });

  it('// unsuccessful | invalid argument', () => {
    return cmdFn({command: {arg: '1,2,3,4,5'}})
    .then(() => {
      expect(mockClient.reply.args[0][0]).to.equal(425);
    });
  });

  it('// successful', () => {
    return cmdFn({command: {arg: '192,168,0,100,137,214'}})
    .then(() => {
      const [ip, port] = ActiveConnector.prototype.setupConnection.args[0];
      expect(mockClient.reply.args[0][0]).to.equal(200);
      expect(ip).to.equal('192.168.0.100');
      expect(port).to.equal(35286);
    });
  });
});
