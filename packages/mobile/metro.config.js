// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Watch the monorepo root
config.watchFolders = [monorepoRoot];

// Resolver order: local first, then root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Explicitly pin these packages to the local node_modules so that
// react@19.1.0 wins over the root's react@18.x (used by Next.js frontend)
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native-screens': path.resolve(projectRoot, 'node_modules/react-native-screens'),
  'scheduler': path.resolve(projectRoot, 'node_modules/scheduler'),
  'expo': path.resolve(projectRoot, 'node_modules/expo'),
  // expo-router lives in root node_modules only — do not override
};

module.exports = config;
