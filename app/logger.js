const utils = require('./utils');

const PREFIX = {
  DEBUG: '\x1b[35m[DEBUG]\x1b[0m',
  INFO: '\x1b[36m[INFO]\x1b[0m',
  WARN: '\x1b[33m[WARN]\x1b[0m',
  ERROR: '\x1b[31m[ERROR]\x1b[0m',
};

class Logger {
  constructor(level) {
    this.level = level;
    this._level = ['debug', 'info', 'warn', 'error'].findIndex(l => l === level);
    if (this._level < 0) this._level = 1;
    this.isDebugging = () => {
      return this._level === 0;
    };
    this.debug = (...args) => {
      if (this._level !== 0) return;
      args.forEach(arg => {
        if (utils.isObject(arg)) {
          console.debug(PREFIX.DEBUG);
          console.dir(arg, { colors: true, depth: 10 });
        } else {
          console.debug(PREFIX.DEBUG, arg);
        }
      });
    };
    this.info = (...args) => {
      if (this._level <= 1) console.info(PREFIX.INFO, ...args);
    };
    this.warn = (...args) => {
      if (this._level <= 2) console.warn(PREFIX.WARN, ...args);
    };
    this.error = (...args) => {
      if (this._level <= 3) console.error(PREFIX.ERROR, ...args);
    };
  }
}

module.exports = Logger;
