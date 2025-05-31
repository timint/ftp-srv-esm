import PassiveConnector from '../../connector/passive.js';

export default {
  directive: 'PASV',
  handler: function ({log} = {}) {
    if (!this.server.options.pasv_hostname) {
      return this.reply(502);
    }

    this.connector = new PassiveConnector(this);
    return this.connector.setupServer()
    .then((server) => {
      const {port} = server.address();
      let pasvAddress = this.server.options.pasv_hostname;
      if (typeof pasvAddress === "function") {
        return Promise.resolve().then(() => pasvAddress(this.ip))
          .then((address) => ({address, port}));
      }
      return {address: pasvAddress, port};
    })
    .then(({address, port}) => {
      const host = address.replace(/\./g, ',');
      const portByte1 = port / 256 | 0;
      const portByte2 = port % 256;

      return this.reply(227, `PASV OK (${host},${portByte1},${portByte2})`);
    })
    .catch((err) => {
      log.error(err);
      return this.reply(err.code || 425, err.message);
    });
  },
  syntax: '{{cmd}}',
  description: 'Initiate passive mode'
};
