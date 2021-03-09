const EventEmitter = require('events');
const fastq = require('fastq');

class VoiceChannel extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.channel = null;
    this.connection = null;
    this.dispatcher = null;
    this.connecting = false;
    this.queue = null;
    this.playing = null;
    this.destroyed = false;
  }

  initialize() {
    this.queue = fastq((audio, done) => {
      if (!this.isPlayable() || !audio.resource) {
        done(new Error('Not playable'), audio);
        return;
      }
      const dispatcher = this.dispatcher = this.connection.play(audio.resource, audio.options);
      let timeout = null;
      if (audio.timeout > 0) timeout = setTimeout(() => dispatcher.end(), audio.timeout);
      dispatcher.on('start', () => {
        this.playing = audio;
        audio.emit('start', this.channel, this.connection, dispatcher);
      });
      dispatcher.on('finish', () => {
        if (timeout) clearTimeout(timeout);
        this.playing = null;
        this.dispatcher = null;
        audio.emit('end', this.channel, this.connection);
        done(null, audio);
      });
    }, 1);
    this.queue.drain = () => this.playing = null;
  }

  destroy() {
    this.destroyed = true;
    this.playing = null;
    this.leave();
  }

  async join(channel) {
    if (this.destroyed || this.connecting || this.connection) return false;
    this.connecting = true;
    try {
      const connection = this.connection = await channel.join();
      this.channel = channel;
      this.connecting = false;
      this.emit('connect', channel, connection);
      if (this.logger.isDebugging()) connection.on('debug', this.logger.debug);
      connection.on('warn', this.logger.warn);
      connection.on('error', this.logger.error);
      connection.on('failed', this.logger.error);
      connection.on('disconnect', () => {
        this.emit('disconnect', channel);
        this.channel = null;
        this.connection = null;
        this.connecting = false;
        if (this.dispatcher) {
          this.dispatcher.end();
          this.dispatcher = null;
        }
      });
    } catch (e) {
      this.connecting = false;
      throw e;
    }
    return true;
  }

  leave() {
    if (this.dispatcher) {
      this.dispatcher.end();
      this.dispatcher = null;
    }
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }
    this.connection = null;
    this.connecting = false;
  }

  play(audio, done) {
    if (!this.isPlayable()) return false;
    this.queue.push(audio, done);
    this.emit('queue', audio, this.channel, this.connection);
    return true;
  }

  next() {
    if (this.dispatcher) this.dispatcher.end();
  }

  isPlayable() {
    if (this.destroyed || !this.connection) return false;
    return this.countHuman() > 0;
  }

  hasMember(member) {
    if (!this.channel) return false;
    return this.channel.members.has(member.id);
  }

  countHuman(channel) {
    if (!channel) channel = this.channel;
    if (!channel) return 0;
    let human = 0;
    channel.members.each(m => { if (!m.user.bot) ++human; });
    return human;
  }
}

module.exports = VoiceChannel;
