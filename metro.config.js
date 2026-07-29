const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  // NOTE: Do NOT block /node_modules\/\.pnpm\/.*/ here — pnpm uses symlinks
  // from node_modules/<pkg> -> .pnpm/<pkg>@version/node_modules/<pkg>. Metro
  // resolves symlinks to their real path, and blocking .pnpm/ would prevent
  // Metro from resolving packages accessed through those symlinks.
  //
  // Also do NOT block /node_modules\/.*\/node_modules\/.*/ — the .pnpm store
  // structure (node_modules/.pnpm/<pkg>/node_modules/<pkg>) matches this pattern
  // and would block the same symlinked packages.
  //
  // Firebase Cloud Functions — has its own package.json with "main": "lib/index.js"
  // which confuses Metro into serving /lib/index.bundle instead of /index.bundle
  /functions\/.*/,
];

module.exports = config;
