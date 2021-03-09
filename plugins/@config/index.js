const { Readable } = require('stream');
const got = require('got');
const yaml = require('js-yaml');
const Discord = require('discord.js');
const utils = require('../../app/utils');

module.exports = {
  name: '@config',
  description: 'Guild configuration',
  order: 18440,
  global: {
    protected: [
      'plugin.config.enabled',
      'plugin.config.config.protected',
    ],
  },
  methods: {
    strip: function(config) {
      if (!config) return;
      this.$global.protected.concat(this.$config.protected).forEach(path => {
        utils.deletePath(config, path);
      });
      if (!config.plugin) return;
      Object.keys(config.plugin).forEach(name => {
        let enabled = this.$app.plugin.get(name).enabled;
        if (utils.isObject(this.$app.config.plugin[name]) && utils.isBoolean(this.$app.config.plugin[name].enabled)) {
          enabled = this.$app.config.plugin[name].enabled;
        }
        if (!enabled) delete config.plugin[name];
      });
    },
    restart: async function(message) {
      const guild = this.$bot.guild;
      await this.$bot.destroy();
      await message.react('🔄');
      await utils.wait(1000);
      const errors = await this.$app.addBot(guild);
      if (!errors) return await message.react('✅');
      const texts = [];
      errors.forEach(e => texts.push(`[${e.type} error]\n${e.content.message || e.content}`));
      await message.channel.send('```' + texts.join('\n\n') + '```');
    },
  },
  commands: {
    export: async function (ctx) {
      const config = utils.clone(this.$bot.config);
      this.strip(config);
      const yamlData = yaml.dump(config, { replacer: (key, value) => {
        if (utils.isObject(value) && Object.keys(value).length === 0) return;
        return value;
      }});
      const stream = new Readable();
      stream.push(yamlData);
      stream.push(null);
      const attachment = new Discord.MessageAttachment(stream, `${this.$bot.guild.id}_config.yml`);
      await ctx.message.reply(attachment);
    },
    import: async function (ctx) {
      try {
        const file = ctx.message.attachments.first();
        if (!file || !file.name.match(/\.yml$/i)) throw new Error('Invalid file');
        const res = await got(file.url);
        const newConfig = yaml.load(res.body);
        const oldConfig = utils.clone(this.$bot.config);
        utils.merge(oldConfig, newConfig);
        this.strip(oldConfig);
        try {
          await this.$bot.store.set('config', oldConfig, true);
          this.$app.logger.info(`Config import ${this.$bot.guild.id} ${ctx.message.member.id}`);
          await this.restart(ctx.message);
        } catch (e) {
          this.$app.logger.error(e);
          await ctx.message.channel.send('```Something went wrong!\nReset and restart!```');
          try {
            await this.$bot.store.delete('config', true);
            await this.restart(ctx.message);
          } catch (e) {
            this.$app.logger.error(e);
            await ctx.message.react('😱');
          }
        }
      } catch (e) {
        this.$app.logger.warn(e.message);
        await ctx.message.channel.send('```' + e.message + '```');
      }
    },
    reset: async function (ctx) {
      try {
        await this.$bot.store.delete('config', true);
        this.$app.logger.info(`Config reset ${this.$bot.guild.id} ${ctx.message.member.id}`);
        await this.restart(ctx.message);
      } catch (e) {
        this.$app.logger.error(e);
        await ctx.message.react('😱');
      }
    },
  },
  afterLaunch: function() {
    const paths = utils.extractPaths(this.$app.config.plugin).map(p => `plugin.${p}`);
    this.$global.protected.push(...paths);
    this.$global.protected = Array.from(new Set(this.$global.protected));
  },
  beforeAttach: function(bot) {
    const config = bot.store.get('config');
    if (!config) return [bot];
    this.strip(config);
    if (config.plugin) utils.merge(config.plugin, this.$app.config.plugin);
    utils.merge(bot.config, config);
    return [bot];
  },
};
