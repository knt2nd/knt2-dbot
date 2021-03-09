const { Readable } = require('stream');
const got = require('got');
const yaml = require('js-yaml');
const Discord = require('discord.js');
const utils = require('../../app/utils');

const MAX_USER_INPUT_LENGTH = 100;

class Dictionary extends Map {
  dump() { return Array.from(this.entries()); }
}

module.exports = {
  name: '@read',
  description: 'Read message features',
  order: 18410,
  data: function() {
    return {
      dictMap: null,
      formatTimerMap: new Map(),
      stripItems: [],
      replaceItems: [],
      warned: false,
    };
  },
  methods: {
    loadStripItems: function() {
      this.$data.stripItems = this.$config.strip.map(r => new RegExp(r.pattern, r.flag));
    },
    loadReplaceItems: function() {
      if (!this.$data.dictMap) return;
      const items = this.$config.replace.concat();
      this.$data.dictMap.forEach((to, pattern) => items.push({ pattern, to, plain: true }));
      items.sort((a, b) => b.pattern.length - a.pattern.length);
      this.$data.replaceItems = items.map(i => {
        const pattern = i.plain ? utils.stripRegExp(i.pattern) : i.pattern;
        const flag = i.plain ? 'ig' : i.flag || 'isg';
        const re = RegExp(pattern, flag);
        return { re, to: i.to };
      });
    },
    strip: function(speech) {
      this.$data.stripItems.forEach(s => speech.text = speech.text.replace(s, ''));
    },
    replace: function(speech) {
      this.$data.replaceItems.forEach(r => speech.text = speech.text.replace(r.re, r.to));
    },
    omit: function(speech) {
      if (!this.$config.omit.length || speech.text.length <= this.$config.omit.length) return;
      speech.text = speech.text.substr(0, this.$config.omit.length) + this.$config.omit.text;
    },
    format: function(speech) {
      if (!speech.message) return;
      let type;
      const member = speech.message.member;
      if (this.$config.format.reset) {
        const oldTimer = this.$data.formatTimerMap.get(member);
        if (oldTimer) {
          this.$app.client.clearTimeout(oldTimer);
          type = 'later';
        } else {
          type = 'first';
        }
        const newTimer = this.$app.client.setTimeout(() => this.$data.formatTimerMap.delete(member), this.$config.format.reset);
        this.$data.formatTimerMap.set(member, newTimer);
      } else {
        type = 'first';
      }
      speech.text = this.$config.format[type].replace('${name}', member.displayName).replace('${message}', speech.text);
    },
    addSkipEvent: function(speech) {
      if (!speech.message) return;
      if (!this.$config.skip.length || !speech.message || speech.text.length < this.$config.skip.length) return;
      const message = speech.message;
      speech.on('start', () => {
        message.react(this.$config.skip.button).catch(this.$app.logger.error);
      });
      speech.on('end', () => {
        const reaction = message.reactions.cache.get(this.$config.skip.button);
        if (reaction) reaction.remove().catch(e => {
          if (this.$data.warned) return;
          this.$app.logger.warn(e);
          message.channel.send('```[WARN] Give me "Manage Messages" permission to remove emoji.```').catch(this.$app.logger.error);
          this.$data.warned = true;
        });
      });
    },
  },
  commands: {
    remember: async function (ctx) {
      if (ctx.options.some(t => t.length > MAX_USER_INPUT_LENGTH)) {
        await ctx.message.react('😟');
        return;
      }
      const pattern = utils.stripRegExp(ctx.options[0]).toLowerCase();
      const to = ctx.options[1];
      if (this.$data.dictMap.has(pattern)) {
        await ctx.message.react('🤔');
        return;
      }
      this.$data.dictMap.set(pattern, to);
      this.$bot.store.set('dict', this.$data.dictMap.dump());
      this.$app.logger.info(`Dict+ ${this.$bot.guild.id} ${ctx.message.member.id} "${pattern}" -> "${to}"`);
      this.loadReplaceItems();
      await ctx.message.react('✅');
    },
    forget: async function (ctx) {
      const pattern = ctx.options[0].toLowerCase();
      if (!this.$data.dictMap.delete(pattern)) {
        await ctx.message.react('🤔');
        return;
      }
      this.$bot.store.set('dict', this.$data.dictMap.dump());
      this.$app.logger.info(`Dict- ${this.$bot.guild.id} ${ctx.message.member.id} "${pattern}"`);
      this.loadReplaceItems();
      await ctx.message.react('✅');
    },
    export: async function (ctx) {
      const dict = {};
      this.$data.dictMap.forEach((to, pattern) => dict[pattern] = to);
      const yamlData = yaml.dump(dict);
      const stream = new Readable();
      stream.push(yamlData);
      stream.push(null);
      const attachment = new Discord.MessageAttachment(stream, `${this.$bot.guild.id}_dict.yml`);
      await ctx.message.reply(attachment);
    },
    import: async function (ctx) {
      try {
        const file = ctx.message.attachments.first();
        if (!file || !file.name.match(/\.yml$/i)) throw new Error('Invalid file');
        const res = await got(file.url);
        const dict = yaml.load(res.body);
        this.$data.dictMap.clear();
        Object.keys(dict).forEach(pattern => {
          const to = dict[pattern];
          if (pattern.length > MAX_USER_INPUT_LENGTH || to.length > MAX_USER_INPUT_LENGTH) return;
          this.$data.dictMap.set(utils.stripRegExp(pattern).toLowerCase(), to);
        });
        this.$bot.store.set('dict', this.$data.dictMap.dump());
        this.$app.logger.info(`Dict import ${this.$bot.guild.id} ${ctx.message.member.id}`);
        this.loadReplaceItems();
        await ctx.message.react('✅');
      } catch (e) {
        this.$app.logger.warn(e.message);
        await ctx.message.channel.send('```' + e.message + '```');
      }
    },
  },
  beforeInitialize: function() {
    this.$data.dictMap = new Dictionary(this.$bot.store.get('dict'));
    this.loadStripItems();
    this.loadReplaceItems();
  },
  beforeSpeak: function(speech) {
    if (!speech.text) return [speech];
    this.strip(speech);
    if (!speech.text) return [speech];
    this.replace(speech);
    if (!speech.text) return [speech];
    this.omit(speech);
    if (!speech.text) return [speech];
    this.addSkipEvent(speech);
    if (!speech.text) return [speech];
    this.format(speech);
    return [speech];
  },
  onMessageReactionAdd: function(messageReaction, user) {
    if (!user.bot && this.$bot.vc.playing && this.$bot.vc.playing.message &&
        this.$bot.vc.playing.message === messageReaction.message &&
        messageReaction.emoji.name === this.$config.skip.button) this.$bot.vc.next();
  },
};
