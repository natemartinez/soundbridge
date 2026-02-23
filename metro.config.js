const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent Metro from watching inside node_modules/.pnpm (pnpm creates thousands
// of symlinked directories that exhaust the Linux inotify watcher limit).
// Source files are still resolved correctly — this only affects hot-reload detection.
config.watchFolders = [__dirname];

module.exports = config;
