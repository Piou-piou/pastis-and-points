const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for serving the public directory as static assets
config.resolver.assetExts.push('json', 'webmanifest');

module.exports = config;
