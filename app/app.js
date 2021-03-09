const EventEmitter = require('events');
const Discord = require('discord.js');
const Bot = require('./bot');
const utils = require('./utils');
const { GUILD_EVENT_MAP, DM_EVENT_MAP } = require('./event');

class App extends EventEmitter {
  constructor(mode, config, store, resume, tts, logger, plugin) {
    super();
    this.mode = mode;
    this.config = config;
    this.store = store;
    this.resume = resume;
    this.tts = tts;
    this.logger = logger;
    this.plugin = plugin;
    this.botMap = new Map();
    this.guildEventMap = new Map();
    this.dmEventMap = new Map();
    this.client = null;
    this.running = false;
    if (!this.config.plugin) this.config.plugin = {};
    if (!this.config.guild) this.config.guild = {};
  }

  get bots() {
    return Array.from(new Set(this.botMap.values()));
  }

  async initialize() {
    this.logger.info('This is Kanata 2nd Discord Bot! Can you hear me?');
    this.logger.info(`Mode: ${this.mode}`);
    this.plugin.initialize();
    GUILD_EVENT_MAP.forEach((extract, name) => {
      if (!this.plugin.hasEvent('on', name)) return;
      this.guildEventMap.set(name, extract);
    });
    DM_EVENT_MAP.forEach((inspect, _name) => {
      const name = `direct${_name.charAt(0).toUpperCase()}${_name.slice(1)}`;
      if (!this.plugin.hasEvent('on', name)) return;
      this.dmEventMap.set(_name, { name, inspect });
    });
    this.logger.info('Plugins:', this.plugin.plugins.map(p => p.name).join(', '));
    this.logger.info('Guild Events:', Array.from(this.guildEventMap.keys()).join(', '));
    this.logger.info('DM Events:', Array.from(this.dmEventMap.keys()).join(', '));
    this.plugin.attach(this, {}, this.config.plugin, { $app: this },
      {
        before: ['launch', 'halt', 'stop', 'attach'],
        after: ['launch', 'start'],
        on: Array.from(this.dmEventMap.values()).map(e => e.name),
      },
      this.logger.error);
    await this.invokeParallel('before', 'launch');
    await this.store.initialize();
    await this.resume.initialize();
    await this.tts.initialize();
    this.logger.info('App launched');
    const token = this.config.discord.token;
    this.config.discord.token = '****';
    this.logger.debug('App config', this.config);
    this.config.discord.token = token;
    await this.invokeParallel('after', 'launch');
  }

  async destroy() {
    await this.stop();
    await this.invokeParallel('before', 'halt');
    this.removeAllListeners();
    await utils.wait(100);
    this.logger.info('App destroyed');
    this.logger.info('Bye!');
    process.exit();
  }

  async start() {
    if (this.running) return;
    const client = new Discord.Client(this.config.discord.client || { restTimeOffset: 100 });
    if (this.logger.isDebugging()) client.on('debug', this.logger.debug);
    client.on('warn', this.logger.warn);
    client.on('error', this.logger.error);
    let shardReadyCount = 0; // short time network down, then shardResume, but long time, shardReady again
    client.on('shardReady', (id, unavailableGuilds) => {
      const logArgs = ['Shard ready', shardReadyCount, id, unavailableGuilds];
      if (shardReadyCount) {
        this.setActivity().catch(this.logger.error); // activity would be empty at this moment
        this.logger.warn(...logArgs);
      } else {
        this.logger.info(...logArgs);
      }
      ++shardReadyCount;
    });
    client.on('shardResume', (id, replayedEvents) => {
      this.logger.warn('Shard resume', id, replayedEvents);
    });
    client.on('shardReconnecting', id => {
      this.logger.warn('Shard reconnecting', id);
    });
    client.on('shardDisconnect', (event, id) => {
      this.logger.info('Shard disconnected', id, event.code, event.wasClean, event.reason);
    });
    client.on('shardError', (error, shardID) => {
      this.logger.error('Shard error', shardID, error);
    });
    client.on('guildCreate', guild => {
      this.addBot(guild)
        .then(() => {
          const bot = this.botMap.get(guild);
          if (!bot) return;
          bot.emit('guildCreate', guild);
        })
        .catch(this.logger.error);
    });
    client.on('guildDelete', guild => {
      const bot = this.botMap.get(guild);
      if (!bot) return;
      bot.destroy().catch(this.logger.error);
    });
    client.on('message', message => {
      if (!message.channel.guild) return;
      const bot = this.botMap.get(message.channel.guild);
      if (!bot) return;
      if (!message.author.bot && message.channel.constructor === Discord.TextChannel) {
        const cmdText = bot.extractCommandText(message);
        if (cmdText) {
          bot.runCommand(cmdText, message).catch(this.logger.error);
          message.command = true;
        } else {
          bot.read(message).catch(this.logger.error);
        }
      }
      bot.emit('message', message);
    });
    this.guildEventMap.forEach((extract, name) => client.on(name, (...args) => {
      const guild = extract(...args);
      if (!guild) return;
      const bot = this.botMap.get(guild) || this.botMap.get(guild.id);
      if (bot) bot.emit(name, ...args);
    }));
    this.dmEventMap.forEach((event, name) => client.on(name, (...args) => {
      if (!event.inspect(...args)) return;
      this.emit(event.name, ...args);
    }));
    await new Promise((resolve, reject) => {
      client.on('ready', () => {
        this.client = client;
        this.running = true;
        this.logger.info(`App started and logged in as ${client.user.id} "${client.user.tag}"`);
        (async () => {
          try {
            await this.setActivity();
            await this.invokeParallel('after', 'start');
            client.guilds.cache.forEach(guild => this.addBot(guild).catch(this.logger.error));
            resolve();
          } catch (e) {
            reject(e);
          }
        })();
      });
      client.login(this.config.discord.token).catch(reject);
    });
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    try { await this.invokeParallel('before', 'stop'); } catch (e) { this.logger.error(e); }
    (await Promise.allSettled(this.bots.map(bot => bot.destroy())))
      .filter(res => res.status === 'rejected')
      .forEach(res => this.logger.error(res.reason));
    this.botMap.clear();
    this.client.destroy();
    this.client = null;
    await utils.wait(100);
    this.logger.info('App stopped');
  }

  async addBot(guild) {
    if (!this.running || this.botMap.has(guild) || this.botMap.has(guild.id)) return;
    const errors = [];
    const config = utils.clone(this.config.guild.default || {});
    config.plugin = this.plugin.createContext(config.plugin);
    utils.merge(config, this.config.guild[guild.id]);
    utils.merge(config.plugin, this.config.plugin);
    const store = this.store.createChild(guild.id, this.logger.error);
    const resume = this.resume.createChild(guild.id, this.logger.error);
    const tts = this.tts.createChild(config.tts);
    await store.initialize();
    await resume.initialize();
    await tts.initialize();
    let bot = new Bot(guild, config, store, resume, tts, this.logger);
    try { [bot] = await this.invokeSeries('before', 'attach', bot); } catch (e) { errors.push({ type: 'attach', content: e }); }
    this.plugin.attach(bot, { lang: bot.lang, data: true, command: true }, bot.config.plugin, { $app: this, $bot: bot },
      {
        on: ['initialize', 'message', 'guildCreate', ...Array.from(this.guildEventMap.keys())],
        before: ['initialize', 'destroy', 'speak'],
      },
      this.logger.error,
      e => { errors.push({ type: 'command', content: e }); });
    bot.on('initialize', () => {
      this.botMap.set(guild, bot);
      this.botMap.set(guild.id, bot);
    });
    bot.on('_destroy', () => {
      this.botMap.delete(guild);
      this.botMap.delete(guild.id);
    });
    const initializeErrors = await bot.initialize();
    if (initializeErrors) initializeErrors.forEach(e => errors.push({ type: 'initialize', content: e }));
    if (!errors.length) return null;
    errors.forEach(e => this.logger.error(`Bot ${e.type} ${guild.id}`, e.content));
    return errors;
  }

  async setActivity() {
    if (!this.client || !this.config.discord.activity) return;
    const activity = utils.isObject(this.config.discord.activity) ?
      this.config.discord.activity :
      { name: this.config.discord.activity, options: undefined };
    return this.client.user.setActivity(activity.name, activity.options);
  }
}

module.exports = App;
