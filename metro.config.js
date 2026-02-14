const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Project root is where this file is
const projectRoot = __dirname;

// Point to the mobile app
const workspaceRoot = path.resolve(projectRoot, 'apps/mobile');

const config = getDefaultConfig(workspaceRoot);

// Tell Metro where to find the mobile app's source
config.projectRoot = workspaceRoot;
config.watchFolders = [projectRoot];

// Resolve modules from both workspace root and project root
config.resolver.nodeModulesPaths = [
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
