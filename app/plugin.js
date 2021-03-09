const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const utils = require('./utils');
const { I18nMessage, I18nCommand } = require('./i18n');

const EVENT_TYPES = ['on', 'before', 'after'];
const DEFAULT_PERMISSION = 'SEND_MESSAGES';

class Plugin {
  constructor(dir) {
    this.dir = dir;
    this.pluginMap = new Map();
    this.eventsMapAll = {};
  }

  get plugins() {
    return Array.from(this.pluginMap.values());
  }

  get(name) {
    return this.pluginMap.get(name);
  }

  has(name) {
    return this.pluginMap.has(name);
  }

  hasEvent(type, name) {
    if (!this.eventsMapAll[type]) return false;
    return this.eventsMapAll[type].has(name.toLowerCase());
  }

  initialize() {
    EVENT_TYPES.forEach(type => this.eventsMapAll[type] = new Map());
    const plugins = [];
    const relDir = path.relative(__dirname, this.dir);
    fs.readdirSync(this.dir).forEach(dir => {
      if (dir.startsWith('!')) return;
      const plugin = require(`${relDir}/${dir}`);
      plugin.builtin = plugin.name.startsWith('@');
      if (plugin.builtin) plugin.name = plugin.name.substr(1);
      if (!plugin.global) plugin.global = {};
      const found = {};
      ['acl', 'i18n', 'config'].forEach(key => {
        let data;
        try {
          data = fs.readFileSync(path.join(this.dir, dir, `${key}.yml`), 'utf8');
        } catch (e) {
          // not found
        }
        if (data) found[key] = yaml.load(data);
      });
      const acl = {};
      if (plugin.commands) {
        Object.keys(plugin.commands).forEach(name => {
          acl[name] = { permission: [DEFAULT_PERMISSION], user: [] };
        });
      }
      if (found.acl) utils.merge(acl, found.acl);
      plugin.acl = acl;
      plugin.i18n = found.i18n || {};
      plugin.config = found.config || {};
      plugin.order = utils.isNumber(plugin.order) ? plugin.order : 0;
      plugin.enabled = utils.isBoolean(plugin.enabled) ? plugin.enabled : true;
      plugins.push(plugin);
    });
    plugins.sort((a, b) => a.order - b.order);
    plugins.forEach(plugin => {
      if (this.pluginMap.has(plugin.name)) throw new Error(`Plugin "${plugin.name}" is duplicated`);
      this.pluginMap.set(plugin.name, plugin);
      Object.keys(plugin).forEach(key => {
        const match = key.toLowerCase().match(new RegExp(`^(${EVENT_TYPES.join('|')})([a-z]+)$`));
        if (!match) return;
        const type = match[1];
        const name = match[2];
        const handler = plugin[key];
        if (!(handler instanceof Function)) return;
        const events = this.eventsMapAll[type].get(name) || [];
        if (!events.length) this.eventsMapAll[type].set(name, events);
        events.push({ plugin, handler });
      });
    });
  }

  createContext(context) {
    const defaultContext = {};
    this.pluginMap.forEach((plugin, name) => {
      defaultContext[name] = {
        enabled: plugin.enabled,
        config: utils.clone(plugin.config),
        acl: utils.clone(plugin.acl),
        i18n: utils.clone(plugin.i18n),
      };
    });
    utils.merge(defaultContext, context);
    return defaultContext;
  }

  attach(emitter, options, context, invokerBase, eventNames, emitEventErrorHandler, createCommandErrorhandler) {
    if (!emitEventErrorHandler) emitEventErrorHandler = () => {};
    if (!createCommandErrorhandler) createCommandErrorhandler = () => {};
    const contextMap = this.createContextMap(options, context, invokerBase);
    const invokersMapAll = this.createInvokersMapAll(contextMap, invokerBase, eventNames);
    this.registerEmitEvents(emitter, invokersMapAll.on, emitEventErrorHandler);
    this.registerInvokeFunctions(emitter, invokersMapAll);
    if (options.command) {
      const commands = this.createCommands(contextMap, invokerBase, createCommandErrorhandler);
      this.registerCommands(emitter, commands);
    }
    emitter.detachPlugin = () => this.detach(emitter);
  }

  detach(emitter) {
    if (emitter.removePluginEvents) emitter.removePluginEvents();
    delete emitter.removePluginEvents;
    delete emitter.getPluginEvents;
    delete emitter.invokeParallel;
    delete emitter.invokeSeries;
    delete emitter.getCommand;
    delete emitter.getCommands;
    delete emitter.createCommandRunner;
    delete emitter.detachPlugin;
  }

  createContextMap(options, context, invokerBase) {
    const contextMap = new Map();
    this.pluginMap.forEach((plugin, name) => {
      let enabled = plugin.enabled;
      if (context && utils.isObject(context[name]) && utils.isBoolean(context[name].enabled)) enabled = context[name].enabled;
      if (!enabled) return;
      const config = utils.clone(plugin.config);
      const acl = utils.clone(plugin.acl);
      const i18nRaw = utils.clone(plugin.i18n);
      if (context && utils.isObject(context[name])) {
        utils.merge(config, context[name].config);
        utils.merge(acl, context[name].acl);
        utils.merge(i18nRaw, context[name].i18n);
      }
      const i18nMessage = new I18nMessage(i18nRaw.message, options.lang);
      const i18nCommand = new I18nCommand(i18nRaw.command, options.lang);
      let data;
      if (!options.data) {
        data = null;
      } else if (!plugin.data) {
        data = {};
      } else if (plugin.data instanceof Function) {
        const invoker = {
          $plugin: plugin,
          $config: config,
          $exec: plugin.data,
          $global: plugin.global,
        };
        Object.assign(invoker, invokerBase);
        data = invoker.$exec();
      } else {
        data = JSON.parse(JSON.stringify(plugin.data));
      }
      contextMap.set(plugin, { config, acl, i18nMessage, i18nCommand, data });
    });
    return contextMap;
  }

  createInvokersMapAll(contextMap, invokerBase, eventNames) {
    const invokersMapAll = {};
    Object.keys(this.eventsMapAll).forEach(type => {
      invokersMapAll[type] = new Map();
      if (!eventNames[type]) return;
      eventNames[type].forEach(name => {
        if (!this.eventsMapAll[type]);
        const invokers = [];
        const events = this.eventsMapAll[type].get(name.toLowerCase()) || [];
        events.forEach(event => {
          const plugin = event.plugin;
          const context = contextMap.get(plugin);
          if (!context) return;
          const invoker = {
            $plugin: plugin,
            $config: context.config,
            $i18n: context.i18nMessage,
            $exec: event.handler,
            $global: plugin.global,
            $data: context.data,
          };
          Object.assign(invoker, invokerBase, plugin.methods);
          invokers.push(invoker);
        });
        invokersMapAll[type].set(name, invokers);
      });
    });
    return invokersMapAll;
  }

  createCommands(contextMap, invokerBase, errorHandler) {
    const commands = [];
    this.pluginMap.forEach(plugin => {
      const context = contextMap.get(plugin);
      if (!context || !plugin.commands) return;
      context.i18nCommand.forEach((metadata, name) => {
        const handler = plugin.commands[name];
        if (!handler) return;
        const patterns = [];
        metadata.pattern.forEach((lp, lang) => {
          lp.forEach(p => {
            try {
              let pattern = p;
              let flags = 'is';
              let indexes = null;
              if (utils.isObject(p)) {
                pattern = p.pattern;
                if (p.flag) flags = p.flag;
                if (p.index && p.index instanceof Array) {
                  indexes = p.index.map(i => {
                    if (!i.toString().match(/^\d+$/)) throw new Error(`Invalid index ${i}`);
                    return i - 0;
                  });
                }
              }
              patterns.push({ re: new RegExp(pattern, flags), indexes, lang });
            } catch (e) {
              errorHandler(e);
            }
          });
        });
        if (!patterns.length) return;
        const invoker = {
          $plugin: plugin,
          $config: context.config,
          $i18n: context.i18nMessage,
          $exec: handler,
          $global: plugin.global,
          $data: context.data,
        };
        Object.assign(invoker, invokerBase, plugin.methods);
        const acl = context.acl[name];
        const isAllowedTo = member => {
          return (acl.permission.length && member.hasPermission(acl.permission)) ||
                 (acl.user.length && acl.user.includes(member.id));
        };
        commands.push({
          name,
          description: metadata.description,
          example: metadata.example,
          plugin,
          invoker,
          patterns,
          isAllowedTo,
        });
      });
    });
    return commands;
  }

  registerEmitEvents(emitter, invokersMap, errorHandler) {
    const pluginEvents = [];
    invokersMap.forEach((invokers, name) => {
      if (invokers.length === 0) return;
      const handler = (...args) => {
        invokers.forEach(invoker => {
          try {
            const promise = invoker.$exec(...args);
            if (promise instanceof Promise) promise.catch(errorHandler);
          } catch (e) {
            errorHandler(e);
          }
        });
      };
      pluginEvents.push({ name, handler });
      emitter.on(name, handler);
    });
    emitter.getPluginEvents = () => pluginEvents;
    emitter.removePluginEvents = () => pluginEvents.forEach(e => emitter.off(e.name, e.handler));
  }

  registerInvokeFunctions(emitter, invokersMapAll) {
    emitter.invokeParallel = async (type, name, ...args) => {
      if (!invokersMapAll[type]) throw new Error(`No type ${type}`);
      const invokers = invokersMapAll[type].get(name);
      if (!invokers) throw new Error(`No event ${name}`);
      const promises = [];
      invokers.forEach(invoker => {
        try {
          const res = invoker.$exec(...args);
          promises.push(res);
        } catch (e) {
          promises.push(Promise.reject(e));
        }
      });
      const results = await Promise.allSettled(promises);
      const success = [];
      const failure = [];
      results.forEach(res => {
        switch (res.status) {
          case 'fulfilled':
            success.push(res.value);
            break;
          case 'rejected':
            failure.push(res.reason);
            break;
        }
      });
      if (failure.length) {
        const error = new Error(`Invoke ${type} ${name} error`);
        error.success = success;
        error.failure = failure;
        throw error;
      }
      return success;
    };
    emitter.invokeSeries = async (type, name, ...args) => {
      if (!invokersMapAll[type]) throw new Error(`No type ${type}`);
      const invokers = invokersMapAll[type].get(name);
      if (!invokers) throw new Error(`No event ${name}`);
      return invokers.reduce((promise, invoker) => {
        return promise.then((_args) => new Promise((resolve, reject) => {
          try {
            const res = _args instanceof Array ? invoker.$exec(..._args) : invoker.$exec();
            if (res instanceof Promise) {
              res.then(resolve).catch(reject);
            } else {
              resolve(res);
            }
          } catch (e) {
            reject(e);
          }
        }));
      }, Promise.resolve(args));
    };
  }

  registerCommands(emitter, commands) {
    emitter.getCommand = (pName, cName) => commands.find(c => pName === c.plugin.name && cName === c.name);
    emitter.getCommands = () => commands;
    emitter.createCommandRunner = (text, context) => {
      const runner = {
        command: null,
        run: null,
      };
      commands.some(c => {
        return c.patterns.some(p => {
          const m = text.match(p.re);
          if (!m) return false;
          runner.command = c;
          Object.assign(context, {
            command: c,
            options: p.indexes ? p.indexes.map(i => m[i]) : m.slice(1),
            lang: p.lang,
            text,
          });
          runner.run = () => c.invoker.$exec(context);
          return true;
        });
      });
      return runner;
    };
  }
}

module.exports = Plugin;
