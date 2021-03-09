const ytdl = require('ytdl-core');

/*

[Cheat Sheet]

Logging:
  - this.$app.logger.debug(...any)
  - this.$app.logger.info(...any)
  - this.$app.logger.warn(...any)
  - this.$app.logger.error(...any)

Permanent datastore:
  - this.$bot.store.get(key)
  - this.$bot.store.set(key, value)
  - this.$bot.store.delete(key)
  - this.$bot.store.forEach(callback)

Datastore to resume specifically:
  - this.$bot.resume.get(key)
  - this.$bot.resume.set(key, value)
  - this.$bot.resume.delete(key)
  - this.$bot.resume.forEach(callback)

Speak:
  - speech = this.$bot.createSpeech(text, message, ttsOptions, playOptions, timeout)
    - text: String
    - message: Discord.Message
    - ttsOptions: { voice: String, pitch: Number(0-100), speed: Number(0-100) }
    - playOptions: https://discord.js.org/#/docs/main/stable/class/VoiceConnection?scrollTo=play
    - timeout: Number (ms, 0 means no-timeout)
  - this.$bot.speak(speech)

Play:
  - audio = this.$bot.createAudio(resource, options, timeout)
    - cf. https://discord.js.org/#/docs/main/stable/class/VoiceConnection?scrollTo=play
  - this.$bot.vc.play(audio)

  */


module.exports = {

  /*
   Metadata
   */

  // Plugin name should be kebab-case and start with alphabet, '@' is reserved by builtin plugins
  name: 'example',

  // Plugin description
  description: 'Plugin example',

  // Order for commands, 18400-18499 are reserved by builtin plugins
  // Default: 0
  order: 0,

  // Enabling option, to be overridden by env.yml
  // Default: true
  enabled: true,




  /*
   Plugin properties
   */

  // Global store, shared with all guilds and app itself
  // Default: {}
  // Access: this.$global
  global: {
    count: 0,
  },

  // Data store, shared with each guild
  // Default: {}
  // Access: this.$data
  data: {
    count: 0,
    queue: 0,
    playingMessage: null,
  },
  // It accepts primitive type only
  // If you want to use other type, use function instead
  // data: function() {
  //   return {
  //     map: new Map(),
  //   };
  // },

  // Methods, available in commands, and event handlers
  // Default: {}
  // Access: this.methodName (e.g. this.countUp)
  methods: {
    countUp: function() {
      ++this.$global.count;
      ++this.$data.count;
    },
  },




  /*
   Commands
   */

  // Command name must be the same as i18n.yml has
  // Arguments: ctx
  //   ctx.command: Command itself
  //   ctx.options: Matched texts
  //   ctx.lang: Matched lang
  //   ctx.text: Message text (stripped wake words)
  //   ctx.message: Discord message object
  commands: {
    // Play Youtube video example
    play: async function(ctx) {
      const url = ctx.options[0];
      if (!ytdl.validateURL(url)) return ctx.message.react('🤔');
      const resource = ytdl(url, { filter: 'audioonly' });
      const playOptions = { volume: 0.2 };
      const audio = this.$bot.createAudio(resource, playOptions, 600000);
      audio.on('start', () => {
        this.$data.playingMessage = ctx.message;
        ctx.message.react(this.$config.stop).catch(this.$app.logger.error);
      });
      audio.on('end', () => {
        --this.$data.queue;
        this.$data.playingMessage = null;
        ctx.message.channel.send(this.$i18n.get('end'));
        const reaction = ctx.message.reactions.cache.get(this.$config.stop);
        if (reaction) reaction.remove().catch(this.$app.logger.error);
      });
      if (!this.$bot.vc.play(audio)) return;
      ++this.$data.queue;
      const options = { name: ctx.message.member.displayName, queue: this.$data.queue };
      await ctx.message.channel.send(this.$i18n.get('start', options));
    },
  },




  /*
   App event handlers, trigger in top level, not in any guild
   Properties: $plugin, $config, $i18n, $global, $app

   Tips:
    - "before" or "after" means app waits until all promises are resolved or rejected
    - "on" means app doesn't wait
   */

  // Fires before app launches
  beforeLaunch: async function() {
    console.log('[EXAMPLE] beforeLaunch');
  },

  // Fires after app launched
  afterLaunch: async function() {
    console.log('[EXAMPLE] afterLaunch');
  },

  // Fires after Discord client logged in
  afterStart: async function() {
    console.log('[EXAMPLE] afterStart');
  },

  // Fires before plugins attach to bot
  // Arguments: bot
  // Return: [bot]
  beforeAttach: async function(bot) {
    console.log('[EXAMPLE] beforeAttach', bot.guild.name);
    return [bot];
  },

  // Fires before Discord client logged out
  beforeStop: async function() {
    console.log('[EXAMPLE] beforeStop');
  },

  // Fires before app halts (but not for sure, Node.js can't handle SIGKILL)
  beforeHalt: async function() {
    console.log('[EXAMPLE] beforeHalt');
  },

  // Fires when DM event fires
  // see doc for details but be aware event name prefix "Direct" added here
  // cf. https://discord.js.org/#/docs/main/stable/class/Client
  onDirectMessage: async function(message) {
    console.log('[EXAMPLE] onDirectMessage');
  },
  onDirectMessageDelete: async function(message) {
    console.log('[EXAMPLE] onDirectMessageDelete');
  },
  onDirectMessageReactionAdd: async function(messageReaction, user) {
    console.log('[EXAMPLE] onDirectMessageReactionAdd');
  },
  onDirectMessageUpdate: async function(oldMessage, newMessage) {
    console.log('[EXAMPLE] onDirectMessageUpdate');
  },
  onDirectTypingStart: async function(channel, user) {
    console.log('[EXAMPLE] onDirectTypingStart');
  },
  onDirectChannelCreate: async function(channel) {
    console.log('[EXAMPLE] onDirectChannelCreate');
  },
  onDirectChannelPinsUpdate: async function(channel, time) {
    console.log('[EXAMPLE] onDirectChannelPinsUpdate');
  },




  /*
   Guild event handlers, trigger in each guild
   Properties: $plugin, $config, $i18n, $global, $app, $bot
   */

  // Fires before bot initializes
  beforeInitialize: async function() {
    console.log('[EXAMPLE] beforeInitialize', this.$bot.guild.name);
  },

  // Fires before bot destroys
  beforeDestroy: async function() {
    console.log('[EXAMPLE] beforeDestroy', this.$bot.guild.name);
  },

  // Fires before bot speaks
  // Arguments: speech
  // Return: [speech]
  beforeSpeak: async function(speech) {
    console.log('[EXAMPLE] beforeSpeak', speech.text);
    return [speech];
  },

  // Fires when bot initialized
  onInitialize: async function() {
    console.log('[EXAMPLE] onInitialize', this.$bot.guild.name);
  },

  // Fires when guild event fires
  // cf. https://discord.js.org/#/docs/main/stable/class/Client
  onMessage: async function(message) {
    console.log('[EXAMPLE] onMessage', message.content);
    // message.command = true, when command activated
    if (message.command) console.log('[EXAMPLE] Command');
    this.countUp();
    console.log('[EXAMPLE] counter', this.$global.count, this.$data.count);
  },
  onMessageDelete: async function(message) {
    console.log('[EXAMPLE] onMessageDelete');
  },
  onMessageDeleteBulk: async function(messages) {
    console.log('[EXAMPLE] onMessageDeleteBulk');
  },
  onMessageReactionAdd: async function(messageReaction, user) {
    console.log('[EXAMPLE] onMessageReactionAdd');
    if (!user.bot && this.$bot.vc.playing &&
      messageReaction.message === this.$data.playingMessage &&
      messageReaction.emoji.name === this.$config.stop) this.$bot.vc.next();
  },
  onMessageReactionRemove: async function(messageReaction, user) {
    console.log('[EXAMPLE] onMessageReactionRemove');
  },
  onMessageReactionRemoveAll: async function(message) {
    console.log('[EXAMPLE] onMessageReactionRemoveAll');
  },
  onMessageReactionRemoveEmoji: async function(reaction) {
    console.log('[EXAMPLE] onMessageReactionRemoveEmoji');
  },
  onMessageUpdate: async function(oldMessage, newMessage) {
    console.log('[EXAMPLE] onMessageUpdate');
  },
  onChannelCreate: async function(channel) {
    console.log('[EXAMPLE] onChannelCreate');
  },
  onChannelDelete: async function(channel) {
    console.log('[EXAMPLE] onChannelDelete');
  },
  onChannelPinsUpdate: async function(channel, time) {
    console.log('[EXAMPLE] onChannelPinsUpdate');
  },
  onChannelUpdate: async function(oldChannel, newChannel) {
    console.log('[EXAMPLE] onChannelUpdate');
  },
  onEmojiCreate: async function(emoji) {
    console.log('[EXAMPLE] onEmojiCreate');
  },
  onEmojiDelete: async function(emoji) {
    console.log('[EXAMPLE] onEmojiDelete');
  },
  onEmojiUpdate: async function(oldEmoji, newEmoji) {
    console.log('[EXAMPLE] onEmojiUpdate');
  },
  onGuildBanAdd: async function(guild, user) {
    console.log('[EXAMPLE] onGuildBanAdd');
  },
  onGuildBanRemove: async function(guild, user) {
    console.log('[EXAMPLE] onGuildBanRemove');
  },
  onGuildCreate: async function(guild) {
    console.log('[EXAMPLE] onGuildCreate');
  },
  onGuildUpdate: async function(oldGuild, newGuild) {
    console.log('[EXAMPLE] onGuildUpdate');
  },
  onRoleCreate: async function(role) {
    console.log('[EXAMPLE] onRoleCreate');
  },
  onRoleDelete: async function(role) {
    console.log('[EXAMPLE] onRoleDelete');
  },
  onRoleUpdate: async function(oldRole, newRole) {
    console.log('[EXAMPLE] onRoleUpdate');
  },
  onTypingStart: async function(channel, user) {
    console.log('[EXAMPLE] onTypingStart');
  },
  onVoiceStateUpdate: async function(oldState, newState) {
    console.log('[EXAMPLE] onVoiceStateUpdate');
  },
  onWebhookUpdate: async function(channel) {
    console.log('[EXAMPLE] onWebhookUpdate');
  },
};
