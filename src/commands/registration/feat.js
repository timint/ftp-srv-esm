export default {
  directive: 'FEAT',
  handler: async function () {
    const registry = (await import('../registry.js')).default;
    const features = Object.keys(registry)
      .reduce((feats, cmd) => {
        const feat = registry[cmd]?.flags?.feat ?? null;
        if (feat) return feats.concat(feat);
        return feats;
      }, ['UTF8'])
      .sort()
      .map((feat) => ({
        message: ` ${feat}`,
        raw: true
      }));
    return features.length
      ? this.reply(211, 'Extensions supported', ...features, 'End')
      : this.reply(211, 'No features');
  },
  syntax: '{{cmd}}',
  description: 'Get the feature list implemented by the server',
  flags: {
    no_auth: true
  }
};
