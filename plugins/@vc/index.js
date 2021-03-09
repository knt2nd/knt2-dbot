const utils = require('../../app/utils');

module.exports = {
  name: '@vc',
  description: 'Voice channel features',
  order: 18430,
  data: function() {
    return {
      onShardResume: null,
      timer: {
        join: new Map(),
      },
    };
  },
  commands: {
    join: async function (ctx) {
      if (!ctx.message.member.voice.channel) {
        await ctx.message.react('🧐');
        return;
      }
      try {
        const res = await this.$bot.vc.join(ctx.message.member.voice.channel);
        if (!res) await ctx.message.react('😓');
      } catch (e) {
        this.$app.logger.error(e);
        await ctx.message.react('⛔');
      }
    },
    leave: async function (ctx) {
      if (!this.$bot.vc.channel || this.$bot.vc.channel !== ctx.message.member.voice.channel) {
        await ctx.message.react('🤔');
        return;
      }
      this.$bot.vc.leave();
    },
  },
  beforeInitialize: function() {
    this.$bot.vc.on('connect', channel => {
      this.$app.logger.info(`VC connected ${this.$bot.guild.id}/${channel.id} "${this.$bot.guild.name}/${channel.name}"`);
      if (this.$config.resume) this.$bot.resume.set('vc', channel.id).catch(this.$app.logger.error);
    });
    this.$bot.vc.on('disconnect', channel => {
      this.$app.logger.info(`VC disconnected ${this.$bot.guild.id}/${channel.id} "${this.$bot.guild.name}/${channel.name}"`);
      if (this.$config.resume) this.$bot.resume.delete('vc').catch(this.$app.logger.error);
    });
    this.$bot.vc.on('queue', (audio, channel) => {
      this.$app.logger.debug(`Queued ${channel.id}`, audio);
    });
    this.$data.onShardResume = () => {
      const channel = this.$bot.vc.channel;
      if (!channel) return;
      (async () => {
        try {
          this.$bot.vc.leave();
          await utils.wait(3000);
          const res = await this.$bot.vc.join(channel);
          this.$app.logger.warn('VC recovered', this.$bot.guild.id, res);
        } catch (e) {
          this.$app.logger.error(e);
        }
      })();
    };
    this.$app.client.on('shardReady', this.$data.onShardResume); // first shardReady event already happened at this moment
    // this.$app.client.on('shardResume', this.$data.onShardResume);
  },
  beforeDestroy: function() {
    if (!this.$data.onShardResume) return;
    this.$app.client.off('shardReady', this.$data.onShardResume);
    // this.$app.client.off('shardResume', this.$data.onShardResume);
  },
  onInitialize: async function() {
    if (!this.$config.resume) return;
    const vc = this.$bot.resume.get('vc');
    if (!vc) return;
    const channel = this.$bot.guild.channels.cache.get(vc);
    if (!channel || this.$bot.vc.countHuman(channel) === 0) return;
    await this.$bot.vc.join(channel);
  },
  onVoiceStateUpdate: async function(oldState, newState) {
    if (newState.member.user.bot) return;
    const oID = oldState.channelID;
    const nID = newState.channelID;
    const vID = this.$bot.vc.channel ? this.$bot.vc.channel.id : null;
    if (this.$config.follow && oID === null && nID !== null && vID === null) {
      const channel = this.$bot.guild.channels.cache.get(nID);
      if (!channel || this.$bot.vc.countHuman(channel) !== 1) return;
      await this.$bot.vc.join(channel);
      return;
    }
    if (vID === null) return; // bot in vc
    if (!oldState.streaming && newState.streaming) {
      if (!this.$config.stream.announce) return;
      if (!this.$config.stream.other && nID !== vID) return;
      await this.$bot.speak(this.$i18n.get('stream', { name: newState.member.displayName }));
      return;
    }
    if (oID === nID) return; // join or leave
    if (oID === vID && this.$bot.vc.countHuman() === 0) {
      this.$bot.vc.leave();
      return;
    }
    if (!this.$config.join.announce) return;
    if (nID === vID) {
      const timeout = this.$data.timer.join.get(newState.member);
      if (timeout) {
        this.$app.client.clearTimeout(timeout);
        this.$data.timer.join.delete(newState.member);
        return;
      }
      await utils.wait(2000);
      await this.$bot.speak(this.$i18n.get('join', { name: newState.member.displayName }));
      return;
    }
    if (oID === vID) {
      const timeout = this.$app.client.setTimeout(() => this.$data.timer.join.delete(oldState.member), this.$config.join.suspend);
      this.$data.timer.join.set(oldState.member, timeout);
    }
  },
};
