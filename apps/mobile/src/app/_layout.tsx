import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isInitialized, isLoading, session, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

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

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    // Define which route groups don't require auth
    const inAuthGroup = segments[0] === '(onboarding)' || segments[0] === 'auth';
    
    if (!session && !inAuthGroup) {
      // User is not signed in and trying to access protected route
      // Redirect to welcome/onboarding
      router.replace('/(onboarding)/welcome');
    } else if (session && inAuthGroup) {
      // User is signed in but on an auth screen
      // Redirect to main app
      router.replace('/(tabs)/home');
    }
  }, [isInitialized, isLoading, session, segments, router]);

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthGate>
        <Slot />
      </AuthGate>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
