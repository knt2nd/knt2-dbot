const Discord = require('discord.js');
const utils = require('../../app/utils');

const CHANGE_TIMEOUT = 600000;
const COLOR = 'BLURPLE';
const VOICE_URL = 'https://cloud.google.com/text-to-speech/docs/voices';
const ACTION_EMOJIS = ['🌏', '🌎', '⬅️', '➡️', '⤴️', '⤵️', '⏫', '⏬', '5⃣', '📢'];

module.exports = {
  name: '@voice',
  description: 'Voice changer',
  order: 18420,
  data: function() {
    return {
      changing: new Map(),
    };
  },
  methods: {
    format: function(ctx) {
      const lang = ctx.langs[ctx.indexes.lang];
      const voices = ctx.voiceMap.get(lang);
      const voice = voices[ctx.indexes.voice];
      return new Discord.MessageEmbed()
        .setColor(COLOR)
        .setTitle(this.$i18n.get('title', { name: ctx.message.member.displayName }, ctx.lang))
        .setURL(VOICE_URL)
        .setFooter(this.$i18n.get('step', { step: ctx.step }, ctx.lang))
        .addField(`${this.$i18n.get('lang', ctx.lang)} [${ctx.indexes.lang + 1}/${ctx.langs.length}]`, lang)
        .addField(`${this.$i18n.get('voice', ctx.lang)} [${ctx.indexes.voice + 1}/${voices.length}]`, voice)
        .addField(`${this.$i18n.get('pitch', ctx.lang)} [0-100]`, ctx.options.pitch)
        .addField(`${this.$i18n.get('speed', ctx.lang)} [0-100]`, ctx.options.speed);
    },
  },
  commands: {
    change: async function (ctx) {
      const options = await this.$bot.tts.getOptions(ctx.message.author);
      const voiceMap = await this.$bot.tts.getLangMap();
      const lang = options.voice.split('-').slice(0, 2).join('-');
      const langs = Array.from(voiceMap.keys());
      const voices = voiceMap.get(lang);
      if (!voices) return ctx.message.react('🤔');
      const langIndex = langs.findIndex(l => l === lang);
      const voiceIndex = voices.findIndex(v => v === options.voice);
      if (langIndex === -1 || voiceIndex === -1) return ctx.message.react('😩');
      const context = {
        message: ctx.message,
        step: 1,
        lang: ctx.lang,
        langs,
        voiceMap,
        options,
        indexes: {
          lang: langIndex,
          voice: voiceIndex,
        },
      };
      const reply = await ctx.message.reply(this.format(context));
      this.$app.client.setTimeout(() => {
        this.$data.changing.delete(reply);
        reply.reactions.removeAll().catch(this.$app.logger.error);
      }, CHANGE_TIMEOUT);
      this.$data.changing.set(reply, context);
      await utils.reactMulti(reply, ACTION_EMOJIS);
    },
  },
  beforeInitialize: async function() {
    const voiceStore = await this.$bot.store.get('voice') || {};
    Object.keys(voiceStore).forEach(id => {
      this.$bot.tts.cache.set(id, voiceStore[id]);
    });
    this.$bot.tts.on('setOptions', (user, options) => {
      voiceStore[user.id] = options;
      this.$bot.store.set('voice', voiceStore);
    });
  },
  onMessageReactionAdd: async function(messageReaction, user) {
    if (user.bot || !this.$data.changing.has(messageReaction.message)) return;
    messageReaction.users.remove(user);
    const ctx = this.$data.changing.get(messageReaction.message);
    if (ctx.message.author !== user) {
      await messageReaction.message.react('🚫');
      return;
    }
    switch (ACTION_EMOJIS.indexOf(messageReaction.emoji.name)) {
      case 0:
        ctx.indexes.lang -= ctx.step;
        ctx.indexes.voice = 0;
        break;
      case 1:
        ctx.indexes.lang += ctx.step;
        ctx.indexes.voice = 0;
        break;
      case 2:
        ctx.indexes.voice -= ctx.step;
        break;
      case 3:
        ctx.indexes.voice += ctx.step;
        break;
      case 4:
        ctx.options.pitch += ctx.step;
        break;
      case 5:
        ctx.options.pitch -= ctx.step;
        break;
      case 6:
        ctx.options.speed += ctx.step;
        break;
      case 7:
        ctx.options.speed -= ctx.step;
        break;
      case 8:
        ctx.step = ctx.step === 1 ? 5 : 1;
        messageReaction.message.edit(null, this.format(ctx));
        return;
      case 9:
        this.$bot.speak(this.$bot.createSpeech(`OK ${ctx.message.member.displayName}`, null, ctx.options));
        return;
      default:
        return;
    }
    if (ctx.indexes.lang < 0) ctx.indexes.lang = ctx.langs.length - 1;
    if (ctx.indexes.lang >= ctx.langs.length) ctx.indexes.lang = 0;
    const lang = ctx.langs[ctx.indexes.lang];
    const voices = ctx.voiceMap.get(lang);
    if (ctx.indexes.voice < 0) ctx.indexes.voice = voices.length - 1;
    if (ctx.indexes.voice >= voices.length) ctx.indexes.voice = 0;
    if (ctx.options.pitch < 0) ctx.options.pitch = 0;
    if (ctx.options.pitch > 100) ctx.options.pitch = 100;
    if (ctx.options.speed < 0) ctx.options.speed = 0;
    if (ctx.options.speed > 100) ctx.options.speed = 100;
    ctx.options.voice = voices[ctx.indexes.voice];
    this.$bot.tts.setOptions(user, ctx.options);
    messageReaction.message.edit(null, this.format(ctx));
  },
};
