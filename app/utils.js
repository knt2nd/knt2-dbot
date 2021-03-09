const Discord = require('discord.js');
const twemoji = require('twemoji-parser');
const utils = {};

utils.wait = async (ms) => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

utils.randomPick = list => {
  return list[Math.floor(Math.random() * list.length)];
};

utils.randomString = () => {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
};

utils.randomNumber = (min, max) => {
  return Math.floor(Math.random() * (max + 1 - min)) + min;
};

utils.isString = target => {
  if (target === undefined || target === null) return false;
  return target.constructor === String;
};

utils.isNumber = target => {
  if (target === undefined || target === null) return false;
  return target.constructor === Number;
};

utils.isBoolean = target => {
  if (target === undefined || target === null) return false;
  return target.constructor === Boolean;
};

utils.isObject = target => {
  if (target === undefined || target === null) return false;
  return target.constructor === Object;
};

utils.compareType = (target1, target2) => {
  if (target1 === null      && target2 === null)      return true;
  if (target1 === undefined && target2 === undefined) return true;
  if (target1 === null      || target2 === null)      return false;
  if (target1 === undefined || target2 === undefined) return false;
  return target1.constructor === target2.constructor;
};

utils.merge = (to, from) => {
  if (!to || !from) return;
  Object.keys(to).forEach(key => {
    // eslint-disable-next-line no-prototype-builtins
    if (!from.hasOwnProperty(key)) return;
    if (utils.isObject(to[key]) && utils.isObject(from[key])) {
      utils.merge(to[key], from[key]);
    } else if (utils.compareType(to[key], from[key])) {
      to[key] = from[key];
    }
  });
};

utils.clone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

const _extractEntries = (target, path, entries) => {
  Object.keys(target).forEach(key => {
    if (utils.isObject(target[key])) {
      _extractEntries(target[key], path.concat([key]), entries);
    } else {
      entries.push([path.concat([key]).join('.'), target[key]]);
    }
  });
  return entries;
};

utils.extractEntries = target => {
  if (!utils.isObject(target)) return [];
  return _extractEntries(target, [], []);
};

const _extractPaths = (target, path, paths) => {
  Object.keys(target).forEach(key => {
    if (utils.isObject(target[key])) {
      _extractPaths(target[key], path.concat([key]), paths);
    } else {
      paths.push(path.concat([key]));
    }
  });
  return paths;
};

utils.extractPaths = target => {
  if (!utils.isObject(target)) return [];
  return _extractPaths(target, [], []).map(path => path.join('.'));
};

const _deletePath = (target, path) => {
  if (!utils.isObject(target) || !path.length) return;
  const key = path[0];
  if (key === '*') {
    Object.keys(target).forEach(key => {
      if (path.length === 1) {
        delete target[key];
      } else {
        _deletePath(target[key], path.slice(1));
      }
    });
  // eslint-disable-next-line no-prototype-builtins
  } else if (!target.hasOwnProperty(key)) {
    return;
  } else if (path.length === 1) {
    delete target[key];
  } else {
    _deletePath(target[key], path.slice(1));
  }
};

utils.deletePath = (target, path) => {
  _deletePath(target, path.split('.'));
};

utils.splitText = (text, max) => {
  if (!text) throw new Error('No text');
  if (isNaN(max) || max < 1) throw new Error('Invalid max');
  const chunks = [];
  while (text.length) {
    if (text.length <= max) {
      chunks.push(text);
      break;
    }
    let t = text.substr(0, max);
    let i = t.lastIndexOf('\n');
    if (i !== -1) {
      t = text.substr(0, i);
      ++i;
    } else {
      i = t.length;
    }
    chunks.push(t);
    text = text.substr(i);
  }
  return chunks.map(t => t.replace(/\n+$/, '').replace(/^\n+/, '')).filter(t => t.length > 0);
};

utils.sendMulti = async (channel, messages) => {
  return messages.reduce((promise, m) => {
    return promise.then(() => channel.send(m));
  }, Promise.resolve());
};

utils.reactMulti = async (message, emojis) => {
  for (let i = 0; i < emojis.length; ++i) {
    await message.react(emojis[i]);
  }
};

utils.decodeMessage = (message, text) => {
  if (text === undefined) text = message.content;
  return text
    .replace(Discord.MessageMentions.USERS_PATTERN, (match, p1) => { const m = message.mentions.members.get(p1); return m ? `@${m.displayName}` : match; })
    .replace(Discord.MessageMentions.ROLES_PATTERN, (match, p1) => { const r = message.mentions.roles.get(p1); return r ? `@${r.name}` : match; })
    .replace(Discord.MessageMentions.CHANNELS_PATTERN, (match, p1) => { const c = message.mentions.channels.get(p1); return c ? `#${c.name}` : match; })
    .replace(/<a?(:[^:\s]+:)[0-9]+>/g, '$1');
};

const REGEXP_PATTERN = /\(.*?\)|\{.*?\}|\[.*?\]|\\c[A-Z]|\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}|\\[bBdDfnrsStvwWn0ux]|[\\^$*+?.|(){}[\]]/g;

utils.stripRegExp = text => {
  return text.replace(REGEXP_PATTERN, '');
};

utils.extractEmoji = (text) => {
  const entities = twemoji.parse(text);
  if (!entities.length) return null;
  return entities[0].text;
};

module.exports = utils;
