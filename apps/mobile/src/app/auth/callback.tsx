import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { supabase } from '../../lib/supabase';
import { getCurrentUser, updateProfile } from '../../lib/api';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { colors, typography, spacing } from '../../theme';
import { Button } from '../../components';

/**
 * Auth Callback Handler
 * 
 * This screen handles OAuth redirects and email verification callbacks.
 * It extracts tokens from the URL, completes the Supabase session, and navigates
 * to the appropriate screen.
 * 
 * Handles:
 * - OAuth callbacks (Google, Apple sign-in)
 * - Email verification links
 * - Password reset links
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { answers } = useOnboardingStore();
  const { setSession, checkEmailVerification, refreshSession } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let subscription: ReturnType<typeof Linking.addEventListener> | null = null;
    
    const handleCallback = async () => {
      try {
        // Detect callback type from URL
        let callbackType: 'oauth' | 'email_verification' | 'recovery' | 'unknown' = 'unknown';
        let hashParams: URLSearchParams | null = null;
        
        // On web, check the URL hash for tokens
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash.substring(1);
          if (hash) {
            hashParams = new URLSearchParams(hash);
            const type = hashParams.get('type');
            
            if (type === 'signup' || type === 'email_change') {
              callbackType = 'email_verification';
              setMessage('Verifying your email...');
            } else if (type === 'recovery') {
              callbackType = 'recovery';
              setMessage('Processing password reset...');
            } else if (hashParams.get('access_token')) {
              callbackType = 'oauth';
              setMessage('Completing sign in...');
            }
          }
        }
        
        // Also check query params
        const type = params.type as string;
        if (type === 'signup' || type === 'email_change') {
          callbackType = 'email_verification';
          setMessage('Verifying your email...');
        } else if (type === 'recovery') {
          callbackType = 'recovery';
          setMessage('Processing password reset...');
        }

        // Wait for Supabase to process the URL tokens
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the session that Supabase should have established from the URL tokens
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          throw error;
        }

        if (session) {
          // Update auth store with the session
          setSession(session);
          
          // Wait for state to propagate
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Handle based on callback type
          if (callbackType === 'email_verification') {
            // Check if email is now verified
            const isVerified = !!session.user?.email_confirmed_at;
            
            if (isVerified) {
              setStatus('success');
              setMessage('Email verified successfully!');
              
              setTimeout(() => {
                router.replace('/(tabs)/analyze');
              }, 1500);
              return;
            }
          } else if (callbackType === 'recovery') {
            // For password recovery, redirect to reset password screen
            router.replace('/auth/reset-password');
            return;
          }
          
          // For OAuth or general callbacks
          // Check if user has an existing profile
          let hasProfile = false;
          try {
            const profileData = await getCurrentUser();
            hasProfile = !!profileData?.user?.displayName;
          } catch (e) {
            console.log('No profile found, user may be new');
          }

          // Save onboarding answers if available and user is new
          if (!hasProfile && answers.tradingStyle) {
            try {
              await updateProfile({
                tradingStyle: answers.tradingStyle,
                experienceLevel: answers.experienceLevel,
              });
            } catch (e) {
              console.warn('Failed to save onboarding preferences:', e);
            }
          }

          setStatus('success');
          setMessage('Success!');
          
          // Navigate to main app
          setTimeout(() => {
            router.replace('/(tabs)/analyze');
          }, 1000);
        } else {
          // No session found - might be an invalid or expired link
          setErrorMessage('The link may have expired or is invalid. Please try again.');
          setStatus('error');
        }
      } catch (error) {
        console.error('Callback error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
        setStatus('error');
      }
    };

    // Handle deep link on mobile
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      // The URL might contain tokens in the hash or query params
      // Supabase should automatically handle them
      await handleCallback();
    };

    // Set up deep link listener for mobile
    if (Platform.OS !== 'web') {
      subscription = Linking.addEventListener('url', handleDeepLink);
      
      // Also check if app was opened with a deep link
      Linking.getInitialURL().then((url) => {
        if (url) {
          console.log('Initial URL:', url);
        }
      });
    }

    // Process the callback
    handleCallback();

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleContinue = () => {
    router.replace('/(tabs)/analyze');
  };

  const handleSignIn = () => {
    router.replace('/(onboarding)/account');
  };

  if (status === 'processing') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.processingText}>{message}</Text>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.title}>{message}</Text>
        <Text style={styles.description}>
          Redirecting you to the app...
        </Text>
      </View>
    );
  }

  // Error state
  return (
    <View style={styles.container}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorIconText}>!</Text>
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.description}>
        {errorMessage || 'There was an issue processing your request.'}
      </Text>
      <Button
        title="Sign In"
        onPress={handleSignIn}
        size="lg"
        style={styles.button}
      />
      <Button
        title="Continue Anyway"
        onPress={handleContinue}
        variant="outline"
        size="lg"
        style={styles.secondaryButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  processingText: {
    ...typography.bodyMd,
    color: colors.neutral[600],
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.green[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIconText: {
    fontSize: 40,
    color: colors.green[600],
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.red[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIconText: {
    fontSize: 40,
    color: colors.red[600],
    fontWeight: 'bold',
  },
  title: {
    ...typography.headingLg,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyMd,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  button: {
    minWidth: 200,
  },
  secondaryButton: {
    minWidth: 200,
    marginTop: spacing.md,
  },
});
