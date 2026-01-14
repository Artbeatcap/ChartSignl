import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  expo: {
    name: 'ChartSignl',
    slug: 'chartsignl',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'chartsignl',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#F8FAFC',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.optionsplungellc.chartsignl',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F8FAFC',
      },
      package: 'com.optionsplungellc.chartsignl',
      permissions: ['com.android.vending.BILLING'],
    },
    web: {
      bundler: 'metro',
      output: 'single',
    },
    plugins: [
      'expo-router',
      // Note: react-native-purchases doesn't have an Expo config plugin
      // RevenueCat is configured at runtime via SDK in _layout.tsx
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || process.env.REVENUECAT_IOS_KEY,
      revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || process.env.REVENUECAT_ANDROID_KEY,
    },
  },
});

