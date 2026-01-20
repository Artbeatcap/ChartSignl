const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve @chartsignl/core from the monorepo
config.resolver.extraNodeModules = {
  '@chartsignl/core': path.resolve(workspaceRoot, 'packages/core/src'),
};

// 4. Exclude react-native-purchases for web platform
// This prevents Metro from trying to bundle the native module for web
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For web platform, provide an empty mock for react-native-purchases
  if (platform === 'web' && moduleName === 'react-native-purchases') {
    return {
      filePath: path.resolve(projectRoot, 'metro.web-mock.js'),
      type: 'sourceFile',
    };
  }
  
  // Use default resolver for all other cases
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
