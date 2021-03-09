const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const utils = require('./utils');

class ChildStore {
  constructor(parent, key, errorHandler, interval) {
    if (!errorHandler) errorHandler = () => {};
    if (!utils.isNumber(interval)) interval = 0;
    this.parent = parent;
    this.key = key;
    this.errorHandler = errorHandler;
    this.interval = interval;
    this.data = {};
    this.immediate = interval === 0;
    this.timer = null;
    this.changed = false;
    this.loaded = false;
    this.destroyed = false;
  }

  async initialize() {
    await this.load();
    if (this.immediate) return;
    this.timer = setInterval(() => this.save().catch(this.errorHandler), this.interval);
  }

  get(key) {
    return this.data[key];
  }

  forEach(callback) {
    Object.keys(this.data).forEach(key => callback(this.data[key], key));
  }

  async delete(key, immediate) {
    if (this.data[key] === undefined) return;
    delete this.data[key];
    this.changed = true;
    if (this.immediate || immediate) await this.save();
  }

  async set(key, value, immediate) {
    this.data[key] = value;
    this.changed = true;
    if (this.immediate || immediate) await this.save();
  }

  async save() {
    if (this.destroyed || !this.changed) return;
    await this.parent.set(this.key, this.data);
    this.changed = false;
  }

  async load(force) {
    if (this.destroyed || (this.loaded && !force)) return;
    const data = await this.parent.get(this.key);
    if (utils.isObject(data)) this.data = data;
    this.loaded = true;
  }

  async destroy() {
    if (this.destroyed) return;
    if (!this.immediate) {
      clearInterval(this.timer);
      await this.save();
    }
    this.destroyed = true;
  }
}

class BaseStore {
  constructor(interval) {
    this.interval = interval;
  }

  createChild(key, errorHandler, interval) {
    if (interval === undefined || interval === null) interval = this.interval;
    return new ChildStore(this, key, errorHandler, interval);
  }
}

class JsonStore extends BaseStore {
  constructor(dir, interval) {
    super(interval);
    this.dir = dir;
  }

  async initialize() {
    await fs.promises.mkdir(this.dir, { recursive: true });
  }

  async get(key) {
    const file = path.join(this.dir, `${key}.json`);
    let content;
    try {
      content = await fs.promises.readFile(file, 'utf8');
    } catch (e) {
      return null;
    }
    return JSON.parse(content);
  }

  async set(key, value) {
    const file = path.join(this.dir, `${key}.json`);
    await fs.promises.writeFile(file, JSON.stringify(value));
  }
}

class YamlStore extends BaseStore {
  constructor(dir, interval) {
    super(interval);
    this.dir = dir;
  }

  async initialize() {
    await fs.promises.mkdir(this.dir, { recursive: true });
  }

  async get(key) {
    const file = path.join(this.dir, `${key}.yml`);
    let content;
    try {
      content = await fs.promises.readFile(file, 'utf8');
    } catch (e) {
      return null;
    }
    return yaml.load(content);
  }

  async set(key, value) {
    const file = path.join(this.dir, `${key}.yml`);
    await fs.promises.writeFile(file, yaml.dump(value), 'utf8');
  }
}

exports.ChildStore = ChildStore;
exports.BaseStore = BaseStore;
exports.JsonStore = JsonStore;
exports.YamlStore = YamlStore;
