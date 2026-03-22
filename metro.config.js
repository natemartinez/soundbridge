const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// pnpm with node-linker=hoisted copies actual package files to node_modules/<pkg>
// (no symlinks). The .pnpm/ virtual store is redundant for Metro's resolver.
// Blocking it prevents Metro from watching thousands of extra directories and
// avoids the ENOSPC inotify watcher limit on Linux.
config.resolver.blockList = [
  // pnpm virtual store — not needed with hoisted linker
  /node_modules\/\.pnpm\/.*/,
  // Nested node_modules inside packages — Metro resolves from the root
  /node_modules\/.*\/node_modules\/.*/,
  // Firebase Cloud Functions — has its own package.json with "main": "lib/index.js"
  // which confuses Metro into serving /lib/index.bundle instead of /index.bundle
  /functions\/.*/,
];

module.exports = config;
