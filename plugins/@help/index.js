const Discord = require('discord.js');
const utils = require('../../app/utils');

const COLOR = 'BLURPLE';

module.exports = {
  name: '@help',
  description: 'Help command',
  order: 18450,
  methods: {
    create: function(lang) {
      const commands = [];
      const showCommand = this.$bot.getCommand('help', 'show');
      const hidden = this.$config.hidden.map(path => { const [plugin, command] = path.split('.'); return { plugin, command }; });
      const wakeWord = this.$bot.config.command ? this.$bot.config.command.example || {} : {};
      if (!wakeWord.default) wakeWord.default = `@${this.$bot.guild.member(this.$app.client.user).displayName}, `;
      this.$bot.getCommands().forEach(c => {
        if (!c.example.has(lang) || !c.description.has(lang) || c === showCommand) return;
        if (hidden.some(h => h.plugin === c.plugin.name && h.command === c.name)) return;
        commands.push({
          example: `${wakeWord[lang] || wakeWord.default}${c.example.get(lang)}`,
          description: c.description.get(lang),
        });
      });
      const langs = this.$config.multilingual ? showCommand.patterns.map(p => p.lang) : [lang];
      langs.sort((a, b) => (a === lang ? -1 : 0) - (b === lang ? -1 : 0));
      langs.forEach(l => {
        if (!showCommand.example.has(l) || !showCommand.description.has(l)) return;
        commands.push({
          example: `${lang !== l ? `[${l}] ` : ''}${wakeWord[l] || wakeWord.default}${showCommand.example.get(l)}`,
          description: showCommand.description.get(l),
        });
      });
      const name = this.$bot.guild.member(this.$app.client.user).displayName;
      const title = this.$i18n.get('title', { name }, lang);
      const description = this.$i18n.get('description', { name }, lang);
      const messages = [];
      let message = new Discord.MessageEmbed().setColor(COLOR).setTitle(title).setDescription(description);
      let length = title.length + description.length;
      commands.forEach(c => {
        length += c.example.length + c.description.length;
        if (length > 6000) {
          messages.push(message);
          message = null;
          length = 0;
        }
        if (!message) message = new Discord.MessageEmbed().setColor(COLOR);
        message.addField(c.example, c.description);
      });
      if (message) messages.push(message);
      if (this.$config.plugin) {
        const plugins = this.$app.plugin.plugins.filter(p => this.$bot.config.plugin[p.name].enabled).map(p => p.name);
        messages[messages.length - 1].setFooter(`Plugins: ${plugins.join(', ')}`);
      }
      return messages;
    },
  },
  commands: {
    show : async function (ctx) {
      const lang = this.$config.multilingual ? ctx.lang : this.$bot.lang;
      const messages = this.create(lang);
      await utils.sendMulti(ctx.message.channel, messages);
    },
  },
  onGuildCreate: async function() {
    if (!this.$config.introduce) return;
    const channel = this.$bot.guild.systemChannel;
    if (!channel) return;
    const messages = this.create(this.$bot.lang);
    await utils.sendMulti(channel, messages);
  },
};
