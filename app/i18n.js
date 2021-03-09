const utils = require('./utils');

class I18nMessage extends Map {
  constructor(data, lang) {
    super(utils.extractEntries(data));
    this.lang = lang;
  }

  get(key, options, lang) {
    if (lang === undefined) {
      if (options === undefined || utils.isObject(options)) {
        lang = this.lang;
      } else {
        lang = options;
        options = null;
      }
    }
    let value = super.get(`${key}.${lang}`);
    if (value === undefined) return '';
    if (value instanceof Array) value = value[Math.floor(Math.random() * value.length)];
    if (!utils.isString(value)) return '';
    if (!options) return value;
    Object.keys(options).forEach(key => value = value.replace(new RegExp('\\${' + key + '}', 'g'), options[key]));
    return value;
  }
}

class I18nCommandField extends Map {
  constructor(lang) {
    super();
    this.lang = lang;
  }

  get default() {
    return this.get(this.lang);
  }

  toString() {
    return this.default;
  }
}

class I18nCommand extends Map {
  constructor(data, lang) {
    const entries = [];
    if (utils.isObject(data)) {
      Object.keys(data).forEach(name => {
        const metadata = {};
        ['description', 'example', 'pattern'].forEach(key => {
          const field = new I18nCommandField(lang);
          if (!utils.isObject(data[name][key])) return metadata[key] = field;
          const langs = Object.keys(data[name][key]);
          langs.sort((a, b) => (a === lang ? -1 : 0) - (b === lang ? -1 : 0));
          langs.forEach(l => field.set(l, data[name][key][l]));
          metadata[key] = field;
        });
        entries.push([name, metadata]);
      });
    }
    super(entries);
    this.lang = lang;
  }
}

exports.I18nMessage = I18nMessage;
exports.I18nCommand = I18nCommand;
