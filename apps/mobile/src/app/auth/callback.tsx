import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { supabase } from '../../lib/supabase';
import { getCurrentUser, updateProfile } from '../../lib/api';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, typography, spacing } from '../../theme';

/**
 * OAuth Callback Handler
 * 
 * This screen handles OAuth redirects after user authenticates with Google or Apple.
 * It extracts tokens from the URL, completes the Supabase session, and navigates
 * to the appropriate screen.
 * 
 * SUPABASE CONFIGURATION REQUIRED:
 * 
 * 1. Go to Supabase Dashboard > Authentication > URL Configuration
 * 2. Add these Redirect URLs:
 *    - chartsignl://auth/callback (for mobile)
 *    - http://localhost:8081/auth/callback (for Expo Go development)
 *    - exp://127.0.0.1:8081/--/auth/callback (alternative Expo Go format)
 * 
 * 3. For each OAuth provider (Google/Apple):
 *    - Go to Authentication > Providers
 *    - Enable the provider
 *    - Add OAuth credentials from provider's developer console
 *    - Configure redirect URLs in the provider's console to match Supabase's callback URL
 * 
 * PLATFORM-SPECIFIC NOTES:
 * - iOS: Apple Sign-In requires Apple Developer account setup and Sign In with Apple capability
 * - Android: Google Sign-In requires SHA-1 certificate fingerprint in Google Cloud Console
 *   (Get SHA-1: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`)
 * - Web: Different redirect URL format needed (handled automatically by expo-auth-session)
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { answers } = useOnboardingStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let subscription: ReturnType<typeof Linking.addEventListener> | null = null;
    
    const handlePostAuth = async () => {
      // Wait a moment for session to be persisted
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if user has an existing profile
      let hasProfile = false;
      try {
        const profileData = await getCurrentUser();
        hasProfile = !!profileData?.user;
      } catch (error) {
        // If getCurrentUser fails, user likely doesn't have a profile yet
        console.log('No existing profile found, will create one');
        hasProfile = false;
      }

      // If user came from onboarding and has onboarding data, save it
      if (!hasProfile && answers.tradingStyle) {
        try {
          await updateProfile({
            display_name: answers.displayName || '',
            trading_style: answers.tradingStyle,
            experience_level: answers.experienceLevel,
            stress_reducer: answers.stressReducer,
            onboarding_completed: true,
          });
        } catch (profileError) {
          console.error('Failed to update profile with onboarding data:', profileError);
          // Continue anyway - profile can be updated later
        }
      }

      setStatus('success');
      
      // Navigate to home screen
      // Using replace to prevent back navigation to this screen
      router.replace('/(tabs)/home');
    };

    const processCallback = async (url: string) => {
      // Parse the URL to extract tokens
      // Supabase OAuth returns: .../auth/callback#access_token=...&refresh_token=... (web)
      // or: chartsignl://auth/callback#access_token=... (mobile) or ?query (rare)
      console.log('[OAuth] processCallback (fragment redacted):', url.replace(/#[^#]*$/, '#...'));

      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      // 1. Hash fragment (common for Supabase OAuth on web and mobile)
      if (url.includes('#')) {
        const hash = url.split('#')[1] || '';
        const p = new URLSearchParams(hash);
        accessToken = p.get('access_token');
        refreshToken = p.get('refresh_token');
      }

      // 2. Query string or URL object (?access_token=... or custom schemes)
      if (!accessToken) {
        try {
          const u = new URL(url);
          accessToken = u.searchParams.get('access_token');
          refreshToken = refreshToken || u.searchParams.get('refresh_token');
        } catch {
          const parsed = Linking.parse(url);
          accessToken = (parsed.queryParams?.access_token as string) || null;
          refreshToken = refreshToken || (parsed.queryParams?.refresh_token as string) || null;
        }
      }

      if (!accessToken) {
        throw new Error('No access token found in callback URL');
      }

      const { error: sessionError, data: sessionData } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error('Failed to create session');

      await handlePostAuth();
    };
    
    const handleCallback = async () => {
      try {
        // On web: prioritize window.location (hash or query) - most reliable after redirect
        if (typeof window !== 'undefined') {
          const hasHashTokens = window.location.hash?.includes('access_token');
          const hasQueryTokens = window.location.search?.includes('access_token');
          if (hasHashTokens || hasQueryTokens) {
            const url = window.location.href;
            console.log('[OAuth] Processing callback from window.location (web)');
            await processCallback(url);
            return;
          }
        }

        // Get the full URL from params or Linking (mobile / deep links)
        let url = params.url as string;

        // Check if tokens are in params directly (e.g. from some routers)
        if (!url && Object.keys(params).length > 0) {
          const accessToken = params.access_token as string;
          const refreshToken = params.refresh_token as string;

          if (accessToken) {
            console.log('[OAuth] Using tokens from params');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) throw sessionError;
            await handlePostAuth();
            return;
          }
        }

        // Try Linking.getInitialURL (mobile cold start from deep link)
        if (!url) {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && initialUrl.includes('auth/callback')) {
            url = initialUrl;
            console.log('[OAuth] Using URL from Linking.getInitialURL');
          }
        }

        // Listen for deep link events (mobile, in case we missed the initial URL)
        subscription = Linking.addEventListener('url', (event) => {
          if (event.url.includes('auth/callback')) {
            processCallback(event.url).catch((err) => {
              console.error('[OAuth] Callback processing error:', err);
              setStatus('error');
              setErrorMessage(err instanceof Error ? err.message : 'Authentication failed');
            });
          }
        });

        if (url && url.includes('auth/callback')) {
          await processCallback(url);
        } else {
          throw new Error('No callback URL found. Please try signing in again.');
        }
      } catch (error) {
        console.error('[OAuth] Callback error:', error);
        setStatus('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Authentication failed. Please try again.'
        );
      }
    };
    
    handleCallback();
    
    return () => {
      subscription?.remove();
    };
  }, [params, router, answers]);

  return (
    <View style={styles.container}>
      {status === 'processing' && (
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.text}>Completing sign-in...</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.content}>
          <Text style={styles.errorTitle}>Authentication Error</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text 
            style={styles.link}
            onPress={() => router.replace('/(onboarding)/account')}
          >
            Return to sign in
          </Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.text}>Redirecting...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  text: {
    ...typography.bodyLg,
    color: colors.neutral[600],
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.headingMd,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  link: {
    ...typography.bodyMd,
    color: colors.primary[600],
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

