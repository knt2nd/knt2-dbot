const { Readable } = require('stream');
const textToSpeech = require('@google-cloud/text-to-speech');
const utils = require('../../app/utils');

// https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
// https://cloud.google.com/text-to-speech/docs/voices

class GoogleCloudTextToSpeech {
  constructor(credential) {
    this.voices = null;
    this.credential = credential;
  }

  async initialize() {
    this.client = new textToSpeech.TextToSpeechClient({ credentials: this.credential });
  }

  async getVoices() {
    if (this.voices) return this.voices;
    const voices = { list: [], allMap: new Map(), langMap: new Map() };
    const [res] = await this.client.listVoices();
    res.voices.map(v => v.name).sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }).forEach(voice => {
      voices.list.push(voice);
      const parts = voice.split('-');
      const lang = parts.slice(0, 2).join('-');
      if (!voices.langMap.has(lang)) voices.langMap.set(lang, []);
      voices.langMap.get(lang).push(voice);
      const keys = [];
      for (let i = 1; i <= parts.length; ++i) {
        keys.push(parts.slice(0, i).join('-'));
      }
      keys.forEach(key => {
        if (!voices.allMap.has(key)) voices.allMap.set(key, []);
        voices.allMap.get(key).push(voice);
      });
    });
    return this.voices = voices;
  }

  async generate(req) {
    if (!req) throw new Error('No request');
    if (!req.text) throw new Error('No text');
    if (req.text.length > 2000) throw new Error('Too long text');
    if (!req.options) throw new Error('No option');
    if (!req.options.voice) throw new Error('No voice');
    const res = {
      data: new Readable(),
      lang: req.options.voice.split('-').slice(0, 2).join('-'),
      voice: req.options.voice,
      pitch : 0,
      rate: 1,
    };
    if (utils.isNumber(req.options.pitch) && req.options.pitch >= 0 && req.options.pitch <= 100) {
      res.pitch = req.options.pitch / 100 * 40 - 20;
    }
    if (utils.isNumber(req.options.speed) && req.options.speed >= 0 && req.options.speed <= 100) {
      res.rate = (req.options.speed < 50) ? req.options.speed / 50 * 0.75 + 0.25 : (req.options.speed - 50) / 50 * 3 + 1;
    }
    const [apiRes] = await this.client.synthesizeSpeech({
      input: { text: req.text },
      voice: { name: res.voice, languageCode: res.lang },
      audioConfig: { pitch: res.pitch, speakingRate: res.rate, audioEncoding: 'MP3' },
    });
    res.data.push(apiRes.audioContent);
    res.data.push(null);
    return res;
  }
}

module.exports = GoogleCloudTextToSpeech;
