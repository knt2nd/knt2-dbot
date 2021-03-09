const EventEmitter = require('events');

const DEFAULT_TIMEOUT = 60000;

class Audio extends EventEmitter {
  constructor(resource, options, timeout) {
    super();
    this.resource = resource || undefined;
    this.options = options || undefined;
    this.timeout = (timeout === undefined || timeout === null) ? DEFAULT_TIMEOUT : timeout;
  }
}

class Speech extends EventEmitter {
  constructor(tts, text, message, ttsOptions, playOptions, timeout) {
    super();
    this.tts = tts;
    this.req = { text, options: ttsOptions, user: (message && !message.author.bot) ? message.author : undefined };
    this.res = undefined;
    this.message = message;
    this.options = playOptions;
    this.timeout = (timeout === undefined || timeout === null) ? DEFAULT_TIMEOUT : timeout;
  }

  get text() {
    return this.req.text;
  }

  set text(value) {
    this.req.text = value;
  }

  get resource() {
    return this.res ? this.res.data : undefined;
  }

  async generate() {
    this.res = await this.tts.generate(this.req);
  }
}

exports.Audio = Audio;
exports.Speech = Speech;
