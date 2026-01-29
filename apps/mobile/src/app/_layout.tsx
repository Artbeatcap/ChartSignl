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
  const { isInitialized, isLoading, session, user, initialize } = useAuthStore();
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
    if (!isInitialized || isLoading) {
      return;
    }

    // If segments is empty on web (Expo Router sometimes has empty segments on initial load),
    // provide a default redirect after a brief delay
    if (!segments || segments.length === 0) {
      // Small timeout to allow segments to populate, then fallback to default route
      const timeoutId = setTimeout(() => {
        if (!segments || segments.length === 0) {
          if (!session && !user) {
            router.replace('/(onboarding)/home');
          } else {
            router.replace('/(tabs)/analyze');
          }
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }

    // Define which route groups don't require auth
    // Include (settings) so privacy/terms pages are accessible without authentication
    const inAuthGroup = segments[0] === '(onboarding)' || segments[0] === 'auth' || segments[0] === '(settings)';
    
    // Exclude reset-password from redirect - it needs a session (from recovery token) but user should stay on screen
    const isResetPassword = segments[0] === 'auth' && segments[1] === 'reset-password';
    
    const hasAuth = session || user;
    if (!hasAuth && !inAuthGroup) {
      // User is not signed in and trying to access protected route
      // Redirect to welcome/onboarding
      router.replace('/(onboarding)/home');
    } else if (hasAuth && inAuthGroup && !isResetPassword) {
      // User is signed in but on an auth screen (except reset-password)
      // Redirect to main app
      router.replace('/(tabs)/analyze');
    }
  }, [isInitialized, isLoading, session, user, segments, router]);

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
