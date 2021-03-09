const fs = require('fs');
const FireStore = require('./firestore');

module.exports = {
  name: '@firestore',
  description: 'Switch datastore to Firestore',
  order: 18491,
  enabled: false,
  beforeLaunch: async function() {
    const credential = JSON.parse(await fs.promises.readFile(this.$config.credential, 'utf8'));
    this.$app.store = new FireStore(credential, this.$config.collection, this.$config.interval);
    this.$app.logger.info(`Datastore: Firestore (${this.$config.collection})`);
    const configPlugin = this.$app.plugin.get('config');
    if (!configPlugin) return;
    configPlugin.global.protected.push('plugin.firestore');
  },
};
