// Mock module for react-native-purchases on web platform
// This prevents Metro from trying to bundle the native module for web

export default {
  configure: async () => {},
  getOfferings: async () => ({ current: null }),
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  logIn: async () => {},
  logOut: async () => {},
  purchasePackage: async () => {
    throw new Error('In-app purchases are not available on web');
  },
  restorePurchases: async () => {
    throw new Error('Restore purchases is not available on web');
  },
};
