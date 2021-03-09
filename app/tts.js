const EventEmitter = require('events');

const calc = (num, max, digit) => {
  const result = Math.floor(num / Math.pow(10, digit) * (max + 1));
  return result > max ? max : result;
};

const clone = (obj) => {
  return Object.assign({}, obj);
};

class TextToSpeechChild extends EventEmitter {
  constructor(parent, config) {
    super();
    this.parent = parent;
    this.config = config;
    this.cache = new Map();
  }

  async initialize() {}

  async getList() {
    return (await this.parent.getVoices()).list;
  }

  async getLangMap() {
    return (await this.parent.getVoices()).langMap;
  }

  async getAllMap() {
    return (await this.parent.getVoices()).allMap;
  }

  async generate(req) {
    if (!req) throw new Error('No request');
    const options = req.options || await this.getOptions(req.user);
    const res = await this.parent.generate({ text: req.text, options });
    this.emit('generate', req, res);
    return res;
  }

  async setOptions(user, options) {
    const newOptions = await this.getOptions(user);
    Object.keys(newOptions).forEach(key => {
      if (options[key] !== undefined) newOptions[key] = options[key];
    });
    this.cache.set(user, newOptions);
    this.emit('setOptions', user, newOptions);
  }

  async getOptions(user) {
    if (!user) return clone(this.config.default);
    let options = this.cache.get(user);
    if (!options) {
      options = await this.createOptions(user.discriminator);
      this.cache.set(user, options);
    }
    return clone(options);
  }

  async createOptions(seed) {
    const voices = (await this.getAllMap()).get(this.config.user.voice);
    if (!voices) return { voice: '', pitch: 50, speed: 50 };
    const v = seed.substr(0, 2) - 0;
    const p = seed.substr(2, 1) - 0;
    const r = seed.substr(3, 1) - 0;
    return {
      voice: voices[calc(v, voices.length - 1, 2)],
      pitch: this.config.user.pitch.min + calc(p, this.config.user.pitch.max - this.config.user.pitch.min, 1),
      speed: this.config.user.speed.min + calc(r, this.config.user.speed.max - this.config.user.speed.min, 1),
    };
  }
}

class DummyEngine {
  constructor() { this.voices = { list: [], allMap: new Map(), langMap: new Map() }; }
  async initialize() {}
  async getVoices() { return this.voices; }
  async generate() { return null; }
}

class TextToSpeech {
  constructor() {
    this.engine = new DummyEngine();
  }

  async initialize() {
    await this.engine.initialize();
  }

  createChild(config) {
    return new TextToSpeechChild(this, config);
  }

  async getVoices() {
    return await this.engine.getVoices();
  }

  async generate(req) {
    return await this.engine.generate(req);
  }
}

exports.TextToSpeechChild = TextToSpeechChild;
exports.TextToSpeech = TextToSpeech;
