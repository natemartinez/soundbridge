const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// pnpm with node-linker=hoisted copies actual package files to node_modules/<pkg>
// (no symlinks). The .pnpm/ virtual store is redundant for Metro's resolver.
// Blocking it prevents Metro from watching ~2000 extra directories and avoids
// the ENOSPC inotify watcher limit on Linux.
config.resolver.blockList = [
  /node_modules\/\.pnpm\/.*/,
];

module.exports = config;
