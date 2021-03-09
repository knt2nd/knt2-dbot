const fs = require('fs');
const GoogleCloudTextToSpeech = require('./gctts');

module.exports = {
  name: '@gctts',
  description: 'Switch TTS to Google Cloud TTS',
  order: 18490,
  beforeLaunch: async function() {
    const credential = JSON.parse(await fs.promises.readFile(this.$config.credential, 'utf8'));
    this.$app.tts.engine = new GoogleCloudTextToSpeech(credential);
    this.$app.logger.info('TTS: Google Cloud TTS');
    const configPlugin = this.$app.plugin.get('config');
    if (!configPlugin) return;
    configPlugin.global.protected.push('plugin.gctts');
  },
  beforeInitialize: function() {
    this.$bot.tts.on('generate', req => {
      this.$app.logger.info(`TTS ${this.$bot.guild.id} ${req.text.length}`);
    });
  },
};
