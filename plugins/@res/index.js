const Discord = require('discord.js');
const utils = require('../../app/utils');

module.exports = {
  name: '@res',
  description: 'Auto response',
  order: 18470,
  data: {
    active: true,
    behaviors: [],
  },
  methods: {
    getWaitTime: function(key) {
      return utils.randomNumber(this.$config.wait[key].min, this.$config.wait[key].max);
    },
  },
  beforeInitialize: function() {
    this.$config.behavior.forEach(b => {
      if (!b.pattern) return;
      const pattern = this.$config.regexp ?
        new RegExp(b.pattern, b.flag || 'is') :
        new RegExp(utils.stripRegExp(b.pattern), 'i');
      const chance = utils.isNumber(b.chance) && b.chance >= 0 && b.chance <= 100 ? b.chance : 100;
      const reactions = [];
      const replies = [];
      if (b.reaction) {
        b.reaction.forEach(r => {
          const emojis = [];
          if (!(r instanceof Array)) r = [r];
          r.forEach(emoji => {
            const standardEmoji = utils.extractEmoji(emoji);
            if (standardEmoji) return emojis.push(standardEmoji);
            const guildEmoji = this.$bot.guild.emojis.cache.find(e => e.name === emoji);
            if (guildEmoji) return emojis.push(guildEmoji);
          });
          if (emojis.length) reactions.push(emojis);
        });
      }
      if (b.reply) {
        b.reply.forEach(r => {
          if (!utils.isString(r) || r.length > 1000) return;
          this.$bot.guild.emojis.cache.each(emoji => {
            if (emoji.deleted) return;
            r = r.replace(`:${emoji.name}:`, `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`);
          });
          replies.push(r);
        });
      }
      this.$data.behaviors.push({ pattern, chance, reactions, replies });
    });
  },
  onMessage: async function(message) {
    if (!this.$data.active || message.author.bot || message.command ||
        message.channel.constructor !== Discord.TextChannel) return;
    const behavior = this.$data.behaviors.find(b => message.content.match(b.pattern) && b.chance > Math.random() * 100);
    if (!behavior) return;
    this.$data.active = false;
    if (behavior.reactions.length) {
      let emojis = utils.randomPick(behavior.reactions);
      if (!(emojis instanceof Array)) emojis = [emojis];
      await utils.wait(this.getWaitTime('reaction'));
      try {
        await utils.reactMulti(message, emojis);
      } catch (e) {
        this.$app.logger.warn(e.message, this.$bot.guild.id, emojis.join(', '));
      }
    }
    if (behavior.replies.length) {
      const text = utils.randomPick(behavior.replies)
        .replace(/\$\{name\}/g, message.member.displayName)
        .replace(/\$\{id\}/g, message.member.id);
      await utils.wait(this.getWaitTime('reply'));
      message.channel.startTyping().catch();
      await utils.wait(this.getWaitTime('typing') + (text.length * this.getWaitTime('char')));
      message.channel.stopTyping(true);
      const reply = await message.channel.send(text);
      if (this.$config.speak && this.$bot.vc.isPlayable()) {
        const speech = this.$bot.createSpeech(utils.decodeMessage(reply), reply);
        await this.$bot.speak(speech);
      }
    }
    setTimeout(() => this.$data.active = true, this.$config.suspend);
  },
};
