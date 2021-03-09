const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const App = require('./app');
const { JsonStore, YamlStore } = require('./datastore');
const { TextToSpeech } = require('./tts');
const Logger = require('./logger');
const Plugin = require('./plugin');

(async () => {
  const onFatal = e => {
    console.error('\x1b[31m[FATAL]\x1b[0m', e);
    process.exit(1);
  };
  try {
    const argv = {};
    process.argv.slice(2).map(a => a.split('=')).forEach(a => argv[a[0]] = a[1]);
    const mode = argv.mode || process.env.NODE_ENV || 'development';
    const env = yaml.load(fs.readFileSync('env.yml', 'utf8'));
    if (!env[mode]) throw new Error(`No environment for ${mode}`);
    const config = env[mode];
    const store = new YamlStore(path.resolve('temp/store'), 600000);
    const resume = new JsonStore(path.resolve('temp/resume'), 60000);
    const tts = new TextToSpeech();
    const logger = new Logger(argv.log || config.log);
    const plugin = new Plugin('plugins');
    const app = new App(mode, config, store, resume, tts, logger, plugin);
    const onExit = () => app.destroy().catch(onFatal);
    process.on('SIGHUP', onExit);
    process.on('SIGINT', onExit);
    process.on('SIGTERM', onExit);
    await app.initialize();
    await app.start();
  } catch (e) {
    onFatal(e);
  }
})();
