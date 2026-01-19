import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { subscriptionService } from '../services/subscription.service';
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
    // Initialize subscription service (handles RevenueCat on mobile, skips on web)
    const initSubscription = async () => {
      try {
        await subscriptionService.initialize();
      } catch (error) {
        console.error('Error initializing subscription service:', error);
      }
    };

    initSubscription();
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
