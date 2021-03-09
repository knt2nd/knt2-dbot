const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

const baseDir = path.resolve('plugins');
fs.readdirSync(baseDir).forEach(dir => {
  if (dir.startsWith('!')) return;
  console.log(`[FOUND] ${dir}`);
  const pluginDir = path.join(baseDir, dir);
  const initFile = path.join(pluginDir, 'init.js');
  const pkgFile = path.join(pluginDir, 'package.json');
  if (fs.existsSync(pkgFile)) {
    const pkg = require(pkgFile);
    if (pkg.dependencies || pkg.devDependencies) {
      const res = child_process.execSync('npm i', { cwd: pluginDir });
      console.log(res.toString());
    }
  }
  if (fs.existsSync(initFile)) require(initFile);
});
