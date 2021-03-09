module.exports = {
  name: '@system',
  description: 'System command',
  order: 18460,
  commands: {
    restart: async function (ctx) {
      await ctx.message.react('🚀');
      await this.$app.stop();
      await this.$app.start();
    },
    halt: async function (ctx) {
      await ctx.message.react('🚀');
      await this.$app.destroy();
    },
  },
  beforeLaunch: function() {
    const configPlugin = this.$app.plugin.get('config');
    if (!configPlugin) return;
    configPlugin.global.protected.push('plugin.system');
  },
};
