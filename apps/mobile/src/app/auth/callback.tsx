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
      // Supabase OAuth returns: chartsignl://auth/callback#access_token=...&refresh_token=...&expires_in=...
      // or: chartsignl://auth/callback?access_token=...&refresh_token=...&expires_in=...
      
      let parsedUrl: URL;
      try {
        // Handle both hash (#) and query (?) parameters
        if (url.includes('#')) {
          const [baseUrl, hash] = url.split('#');
          parsedUrl = new URL(`${baseUrl}?${hash}`);
        } else {
          parsedUrl = new URL(url);
        }
      } catch (e) {
        // Fallback: use Linking.parse for React Native
        const parsed = Linking.parse(url);
        const accessToken = parsed.queryParams?.access_token as string;
        const refreshToken = parsed.queryParams?.refresh_token as string;

        if (!accessToken) {
          throw new Error('No access token found in callback URL');
        }

        // Set session with tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) throw sessionError;

        await handlePostAuth();
        return;
      }

      // Extract tokens from URL
      const accessToken = parsedUrl.searchParams.get('access_token') || parsedUrl.hash.match(/access_token=([^&]+)/)?.[1];
      const refreshToken = parsedUrl.searchParams.get('refresh_token') || parsedUrl.hash.match(/refresh_token=([^&]+)/)?.[1];

      if (!accessToken) {
        throw new Error('No access token found in callback URL');
      }

      // Set session with tokens
      const { error: sessionError, data: sessionData } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        throw new Error('Failed to create session');
      }

      await handlePostAuth();
    };
    
    const handleCallback = async () => {
      try {
        // Get the full URL from params or Linking
        // Supabase returns hash fragments (#access_token=...&refresh_token=...)
        // or query parameters (?access_token=...&refresh_token=...)
        let url = params.url as string;
        
        // Try to get URL from query params first
        if (!url && Object.keys(params).length > 0) {
          // Check if tokens are in params directly
          const accessToken = params.access_token as string;
          const refreshToken = params.refresh_token as string;
          
          if (accessToken) {
            // Tokens are in params directly, use them
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) throw sessionError;
            await handlePostAuth();
            return;
          }
        }
        
        // If no URL in params, try to get from Linking
        if (!url) {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && initialUrl.includes('auth/callback')) {
            url = initialUrl;
          }
        }
        
        // Listen for deep link events in case we missed the initial URL
        subscription = Linking.addEventListener('url', (event) => {
          if (event.url.includes('auth/callback')) {
            processCallback(event.url).catch((error) => {
              console.error('Callback processing error:', error);
              setStatus('error');
              setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
            });
          }
        });
        
        if (url && url.includes('auth/callback')) {
          await processCallback(url);
        } else {
          // If still no URL, try parsing from hash fragments in window.location (web fallback)
          if (typeof window !== 'undefined' && window.location?.hash) {
            const hash = window.location.hash.substring(1); // Remove #
            const urlParams = new URLSearchParams(hash);
            const accessToken = urlParams.get('access_token');
            const refreshToken = urlParams.get('refresh_token');
            
            if (accessToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              
              if (sessionError) throw sessionError;
              await handlePostAuth();
              return;
            }
          }
          
          throw new Error('No callback URL found. Please try signing in again.');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
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

