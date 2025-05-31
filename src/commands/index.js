import REGISTRY from './registry.js';

const CMD_FLAG_REGEX = new RegExp(/^-(\w{1})$/);

class FtpCommands {
  constructor(connection) {
    this.connection = connection;
    this.previousCommand = {};
    this.blacklist = (connection?.server?.options?.blacklist ?? []).map((cmd) =>
      typeof cmd === 'string' ? cmd.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).toUpperCase() : cmd
    );
    this.whitelist = (connection?.server?.options?.whitelist ?? []).map((cmd) =>
      typeof cmd === 'string' ? cmd.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).toUpperCase() : cmd
    );
  }

  parse(message) {
    const strippedMessage = message.replace(/"/g, '');
    let [directive, ...args] = strippedMessage.split(' ');
    directive = directive.trim().toUpperCase();

    const parseCommandFlags = !['RETR', 'SIZE', 'STOR'].includes(directive);
    const params = args.reduce(({arg, flags}, param) => {
      if (parseCommandFlags && CMD_FLAG_REGEX.test(param)) flags.push(param);
      else arg.push(param);
      return {arg, flags};
    }, {arg: [], flags: []});

    const command = {
      directive,
      arg: params.arg.length ? params.arg.join(' ') : null,
      flags: params.flags,
      raw: message
    };
    return command;
  }

  handle(command) {
    if (typeof command === 'string') command = this.parse(command);

    // Obfuscate password from logs
    const logCommand = { ...command };
    if (logCommand.directive === 'PASS') logCommand.arg = '********';

    const log = this.connection.log.child({directive: command.directive});
    log.debug('Handle command', {command: logCommand});

    if (!Object.prototype.hasOwnProperty.call(REGISTRY, command.directive)) {
      return this.connection.reply(502, `Command not allowed: ${command.directive}`);
    }

    if (this.blacklist.includes(command.directive)) {
      return this.connection.reply(502, `Command blacklisted: ${command.directive}`);
    }

    if (this.whitelist.length > 0 && !this.whitelist.includes(command.directive)) {
      return this.connection.reply(502, `Command not whitelisted: ${command.directive}`);
    }

    const commandRegister = REGISTRY[command.directive];
    const commandFlags = (commandRegister && commandRegister.flags) ? commandRegister.flags : {};
    if (!commandFlags.no_auth && !this.connection.authenticated) {
      return this.connection.reply(530, `Command requires authentication: ${command.directive}`);
    }

    if (!commandRegister.handler) {
      return this.connection.reply(502, `Handler not set on command: ${command.directive}`);
    }

    const handler = commandRegister.handler.bind(this.connection);
    return Promise.resolve(handler({log, command, previous_command: this.previousCommand}))
    .then(() => {
      this.previousCommand = {...command};
    });
  }
}

export default FtpCommands;
