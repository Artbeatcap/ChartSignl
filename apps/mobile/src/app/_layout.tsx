import { useEffect, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
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
  const hasSeenNonEmptySegments = useRef(false);

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

    // On web, /privacy and /terms are static HTML served by nginx—no auth. If the SPA was
    // loaded for this path (e.g. nginx served index.html), force a full page load so nginx
    // serves the static file and non-users can see the page.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const hash = window.location.hash || '';
      if (pathname === '/privacy' || pathname === '/terms') {
        window.location.href = pathname;
        return;
      }
      // Supabase/Google may redirect to site root with tokens in hash; redirect to callback so it can process and then to /home
      if ((pathname === '/' || pathname === '') && hash.includes('access_token=')) {
        window.location.replace('/auth/callback' + hash);
        return;
      }
    }

    // Track if we've ever had non-empty segments (so we don't redirect on mid-navigation empty segments)
    if (segments && segments.length > 0) {
      hasSeenNonEmptySegments.current = true;
    }

    // If segments is empty on web (Expo Router sometimes has empty segments on initial load),
    // provide a default redirect after a brief delay. Skip redirect when we've already seen
    // non-empty segments (e.g. user tapped Profile -> Edit Profile and segments went empty briefly).
    if (!segments || segments.length === 0) {
      const timeoutId = setTimeout(() => {
        if (!hasSeenNonEmptySegments.current) {
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
    
    // Check if user has any auth (session OR user object for unverified users)
    const hasAuth = session || user;

    if (!hasAuth && !inAuthGroup) {
      // User is not signed in and trying to access protected route
      // Redirect to welcome/onboarding
      console.log('AuthGate: No auth, redirecting to home');
      router.replace('/(onboarding)/home');
    } else if (hasAuth && inAuthGroup && !isResetPassword) {
      // User is signed in but on an auth screen (except reset-password)
      // Only redirect if they're on onboarding pages, not settings
      if (segments[0] === '(onboarding)') {
        console.log('AuthGate: Has auth, on onboarding, redirecting to analyze');
        router.replace('/(tabs)/analyze');
      }
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
