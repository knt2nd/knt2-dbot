const EventEmitter = require('events');
const { Audio, Speech } = require('./audio');
const VoiceChannel = require('./vc');
const utils = require('./utils');

class Bot extends EventEmitter {
  constructor(guild, config, store, resume, tts, logger) {
    super();
    this.guild = guild;
    this.config = config;
    this.store = store;
    this.resume = resume;
    this.tts = tts;
    this.logger = logger;
    this.cmdPatterns = [];
    this.vc = new VoiceChannel(logger);
    this.isReadable = () => false;
  }

  get lang() {
    return this.config.lang;
  }

  async initialize() {
    const errors = [];
    try { await this.invokeParallel('before', 'initialize'); } catch (e) { e.failure.forEach(e => errors.push(e)); }
    this.cmdPatterns.push(new RegExp(`^<@!?(${this.guild.client.user.id})>[\\s,.、，．。　]*(.+)`, 's'));
    if (this.config.command && this.config.command.pattern) {
      this.config.command.pattern.forEach(p => { try { this.cmdPatterns.push(new RegExp(`${p}(.+)`, 'is')); } catch (e) { errors.push(e); } });
    }
    switch (this.config.read) {
      case 'all':
        this.isReadable = () => true;
        break;
      case 'joined':
        this.isReadable = (member) => this.vc.hasMember(member);
        break;
      case 'muted':
        this.isReadable = (member) => this.vc.hasMember(member) && member.voice.mute;
        break;
    }
    this.vc.initialize();
    this.vc.on('debug', this.logger.debug);
    this.vc.on('warn', this.logger.warn);
    this.vc.on('error', this.logger.error);
    this.vc.on('failed', this.logger.error);
    this.logger.info(`Bot initialized ${this.guild.id} "${this.guild.name}"`);
    this.logger.debug(`Bot config ${this.guild.id}`, this.config);
    this.emit('initialize');
    return errors.length ? errors : null;
  }

  async destroy() {
    this.emit('_destroy');
    try { await this.invokeParallel('before', 'destroy'); } catch (e) { this.logger.error(e); }
    try { await this.store.destroy(); } catch (e) { this.logger.error(e); }
    try { await this.resume.destroy(); } catch (e) { this.logger.error(e); }
    this.vc.destroy();
    this.removeAllListeners();
    await utils.wait(100);
    this.logger.info(`Bot destroyed ${this.guild.id}`);
  }

  extractCommandText(message) {
    let cmdText;
    this.cmdPatterns.some(pattern => {
      const match = message.content.match(pattern);
      if (!match) return false;
      cmdText = match[match.length - 1];
      return true;
    });
    return cmdText;
  }

  async runCommand(cmdText, message) {
    const runner = this.createCommandRunner(cmdText, { message });
    if (!runner.run) {
      await message.react('❓');
      return;
    }
    if (!runner.command.isAllowedTo(message.member)) {
      await message.react('🚫');
      this.logger.warn(`ACL denied ${runner.command.plugin.name}.${runner.command.name} in ${this.guild.id} "${this.guild.name}" to ${message.member.id} "${message.member.displayName}"`);
      return;
    }
    return await runner.run();
  }

  createAudio(...args) {
    return new Audio(...args);
  }

  createSpeech(...args) {
    return new Speech(this.tts, ...args);
  }

  async speak(speech) {
    if (!this.vc.isPlayable()) return false;
    if (!(speech instanceof Speech)) speech = this.createSpeech(speech);
    [speech] = await this.invokeSeries('before', 'speak', speech);
    if (!speech.text) return false;
    await speech.generate();
    if (!speech.resource) return false;
    return this.vc.play(speech, err => { if (err) this.logger.warn(err.message, this.guild.id); });
  }

  async read(message) {
    if (!this.vc.isPlayable()) return false;
    if (!this.isReadable(message.member)) return false;
    const speech = this.createSpeech(utils.decodeMessage(message), message);
    return await this.speak(speech);
  }
}

module.exports = Bot;
