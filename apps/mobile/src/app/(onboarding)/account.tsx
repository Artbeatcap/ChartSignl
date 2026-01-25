import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Button, ProgressIndicator, Input } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { updateProfile } from '../../lib/api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

// Complete auth session in browser
WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'signup' | 'signin';

export default function AccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: AuthMode }>();
  const { answers } = useOnboardingStore();
  const { setPendingEmailVerification, setSession, user } = useAuthStore();
  
  // Use mode from route params, default to 'signup' if not provided
  const [mode, setMode] = useState<AuthMode>(params.mode || 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const passwordInputRef = useRef<TextInput>(null);
  
  // Watch for auth success via onAuthStateChange
  useEffect(() => {
    if (isLoading && user) {
      // User authenticated successfully, navigate away immediately
      console.log('[AccountScreen] User detected, navigating to home');
      setIsLoading(false);
      router.replace('/(tabs)/home');
    }
  }, [isLoading, user, router]);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        // Add timeout to prevent hanging on sign-up
        const signUpPromise = supabase.auth.signUp({
          email,
          password,
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Sign-up timeout - please try again')), 10000)
        );
        
        const { data, error: signUpError } = await Promise.race([
          signUpPromise,
          timeoutPromise
        ]).catch(err => {
          throw new Error(err.message || 'Sign-up failed');
        });

        // Handle signup errors - if user was created but email failed, allow continuation
        if (signUpError) {
          // If user was created but email sending failed, allow user to continue
          // They can verify email later via the resend button
          if (data?.user && (signUpError.message?.includes('confirmation email') || signUpError.message?.includes('Error sending'))) {
            // Continue with user creation flow - user can resend email later
            // Don't throw error, proceed to user creation flow below
          } else {
            // Other errors should still be thrown
            throw signUpError;
          }
        }

        if (data.user) {
          // Check if email confirmation is required (no session means confirmation needed)
          const needsEmailVerification = !data.session;
          
          // If we have a session, update the auth store immediately
          if (data.session) {
            // CRITICAL: Explicitly update the auth store
            setSession(data.session);
            
            // Small delay for state propagation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Save onboarding data to profile with retry logic
            let profileCreated = false;
            let retries = 0;
            const maxRetries = 3;
            
            while (!profileCreated && retries < maxRetries) {
              try {
                await updateProfile({
                  display_name: answers.displayName,
                  trading_style: answers.tradingStyle,
                  experience_level: answers.experienceLevel,
                  stress_reducer: answers.stressReducer,
                  onboarding_completed: true,
                });
                profileCreated = true;
                console.log('Profile created successfully');
              } catch (profileError: any) {
                retries++;
                console.error(`Failed to update profile (attempt ${retries}/${maxRetries}):`, profileError);
                
                if (retries < maxRetries) {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                } else {
                  // Final attempt failed - log but continue
                  console.error('Profile creation failed after retries, user can update profile later');
                }
              }
            }
          } else {
            // No session yet - profile will be created after email verification
            console.log('User created but email verification required, profile will be created after verification');
          }

          // Set pending email verification flag if needed, then navigate to home
          if (needsEmailVerification) {
            setPendingEmailVerification(true);
          }
          
          // Navigate to home - user can use app with or without verification
          router.replace('/(tabs)/home');
        }
      } else {
        // Sign-in mode: Start the sign-in but don't wait for it
        // The onAuthStateChange listener will update the store, and useEffect will navigate
        console.log('[AccountScreen] Starting sign-in');
        
        supabase.auth.signInWithPassword({
          email,
          password,
        }).then(result => {
          console.log('[AccountScreen] signInWithPassword resolved:', !!result.data.session);
          if (result.error) {
            console.error('[AccountScreen] Sign-in error:', result.error.message);
            setError(result.error.message);
            setIsLoading(false);
          }
        }).catch(err => {
          console.error('[AccountScreen] Sign-in caught error:', err);
          setError(err instanceof Error ? err.message : 'Sign-in failed');
          setIsLoading(false);
        });
        
        // Set a timeout to catch if sign-in takes too long
        setTimeout(() => {
          if (isLoading) {
            console.warn('[AccountScreen] Sign-in timeout after 8 seconds');
            setError('Sign-in is taking longer than expected. Please try again.');
            setIsLoading(false);
          }
        }, 8000);
        
        // Exit early - don't throw or navigate here, let useEffect handle it
        return;
      }
    } catch (err) {
      console.error('[AccountScreen] handleEmailAuth error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      
      // Provide more helpful error message for email configuration issues
      if (errorMessage.includes('confirmation email') || errorMessage.includes('Error sending')) {
        const detailedMessage = 'Email verification is misconfigured in Supabase.\n\nTo fix:\n1. Go to Supabase Dashboard > Authentication > Settings\n2. Either disable "Enable email confirmations", OR\n3. Configure SMTP under Authentication > Email Templates\n\nFor development, disabling email confirmations is recommended.';
        
        // Show detailed error in Alert for better visibility (works on mobile)
        // On web, Alert.alert may not work reliably, so we'll also set the error text
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Email Configuration Error',
            detailedMessage,
            [{ text: 'OK' }]
          );
          setError('Email configuration error - see Alert above');
        } else {
          // On web, show the full message in the error text
          setError(detailedMessage);
        }
        
        return; // Don't set the error text again since we already set it
      }
      
      setError(errorMessage);
    } finally {
      // Only clear loading for sign-up (sign-in uses async flow with useEffect)
      if (mode === 'signup') {
        setIsLoading(false);
      }
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);

    try {
      // Create redirect URL using expo-auth-session
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'chartsignl',
        path: 'auth/callback',
      });

      console.log('OAuth Redirect URL:', redirectUrl); // For debugging

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      // If we get a URL back, open it in the browser
      // The browser will redirect back to our app with the tokens
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        // Handle the result - if user cancels, reset loading state
        if (result.type === 'cancel') {
          setIsLoading(false);
          return;
        }

        // The callback handler will process the result
        // We don't need to do anything else here
      }
    } catch (err) {
      let errorMessage = 'Authentication failed';
      
      if (err instanceof Error) {
        if (err.message.includes('Provider not enabled')) {
          errorMessage = 'This sign-in method is not configured yet. Please contact support or use email sign-in.';
        } else if (err.message.includes('redirect') || err.message.includes('Redirect')) {
          errorMessage = 'OAuth redirect not configured. Check Supabase settings.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webWrapper}>
        <View style={styles.webInner}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            {mode === 'signup' && <ProgressIndicator current={4} total={4} />}
          </View>

          <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signup'
              ? 'Save your progress and unlock all features'
              : 'Sign in to continue your journey'}
          </Text>
        </View>

        {/* Social auth buttons */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth('google')}
            disabled={isLoading}
          >
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth('apple')}
            disabled={isLoading}
          >
            <Text style={styles.socialIcon}></Text>
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email form */}
        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />
          
          <Input
            ref={passwordInputRef}
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            containerStyle={{ marginTop: spacing.md }}
            returnKeyType="go"
            onSubmitEditing={handleEmailAuth}
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Button
            title={mode === 'signup' ? 'Create Account' : 'Sign In'}
            onPress={handleEmailAuth}
            size="lg"
            fullWidth
            loading={isLoading}
            style={{ marginTop: spacing.lg }}
          />
        </View>

        {/* Toggle mode */}
        <View style={styles.toggleMode}>
          <Text style={styles.toggleText}>
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
          </Text>
          <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
            <Text style={styles.toggleLink}>
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </Text>
          </TouchableOpacity>
        </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const WEB_MAX_WIDTH = 600;

const styles = StyleSheet.create({
  container: {
    ...(Platform.OS !== 'web' && { flex: 1 }),
    ...(Platform.OS === 'web' && { height: '100vh', overflow: 'auto' }),
    backgroundColor: colors.background,
  },
  webWrapper: {
    ...(Platform.OS !== 'web' && { flex: 1 }),
    ...(Platform.OS === 'web' && {
      alignItems: 'center',
      paddingTop: 40,
    }),
  },
  webInner: {
    ...(Platform.OS !== 'web' && { flex: 1 }),
    width: '100%',
    ...(Platform.OS === 'web' && { maxWidth: WEB_MAX_WIDTH }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    fontSize: 24,
    color: colors.neutral[600],
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'web' ? spacing.xxl * 3 : spacing.xl,
  },
  titleSection: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.displaySm,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.neutral[500],
  },
  socialButtons: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    height: 52,
    gap: spacing.sm,
    ...shadows.sm,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  socialButtonText: {
    ...typography.labelLg,
    color: colors.neutral[700],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  dividerText: {
    ...typography.bodySm,
    color: colors.neutral[400],
  },
  form: {
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  toggleMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleText: {
    ...typography.bodyMd,
    color: colors.neutral[500],
  },
  toggleLink: {
    ...typography.bodyMd,
    color: colors.primary[600],
    fontWeight: '600',
  },
});
