import ActiveConnector from '../../connector/active.js';

const FAMILY = {
  1: 4,
  2: 6
};

export default {
  directive: 'EPRT',
  handler: function ({log, command} = {}) {
    const arg = (command && command.arg) || '';
    const parts = arg.split('|');
    const protocol = parts[1];
    const ip = parts[2];
    const port = parts[3];
    const family = FAMILY[protocol];
    if (!family) return this.reply(504, 'Unknown network protocol');

    this.connector = new ActiveConnector(this);
    return this.connector.setupConnection(ip, port, family)
    .then(() => this.reply(200))
    .catch((err) => {
      log.error(err);
      return this.reply(err.code || 425, err.message);
    });
  },
  syntax: '{{cmd}} |<protocol>|<address>|<port>|',
  description: 'Specifies an address and port to which the server should connect'
};
