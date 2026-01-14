import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize RevenueCat with lazy import to avoid module resolution issues
    const initRevenueCat = async () => {
      try {
        // Lazy import to avoid loading during config evaluation
        const Purchases = (await import('react-native-purchases')).default;
        
        if (Platform.OS === 'ios') {
          const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || process.env.REVENUECAT_IOS_KEY;
          if (iosKey) {
            await Purchases.configure({ apiKey: iosKey });
            console.log('RevenueCat initialized for iOS');
          } else {
            console.warn('RevenueCat iOS key not found');
          }
        } else if (Platform.OS === 'android') {
          const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || process.env.REVENUECAT_ANDROID_KEY;
          if (androidKey) {
            await Purchases.configure({ apiKey: androidKey });
            console.log('RevenueCat initialized for Android');
          } else {
            console.warn('RevenueCat Android key not found');
          }
        }
      } catch (error) {
        console.error('Error initializing RevenueCat:', error);
      }
    };

    initRevenueCat();
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="premium"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            title: 'Premium',
          }}
        />
        <Stack.Screen
          name="(settings)"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
