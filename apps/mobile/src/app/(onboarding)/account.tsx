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
  const { setPendingEmailVerification } = useAuthStore();
  
  // Use mode from route params, default to 'signup' if not provided
  const [mode, setMode] = useState<AuthMode>(params.mode || 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const passwordInputRef = useRef<TextInput>(null);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
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
          
          // If we have a session, wait for it to be persisted
          if (data.session) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Save onboarding data to profile (try even without session)
          try {
            await updateProfile({
              display_name: answers.displayName,
              trading_style: answers.tradingStyle,
              experience_level: answers.experienceLevel,
              stress_reducer: answers.stressReducer,
              onboarding_completed: true,
            });
          } catch (profileError) {
            console.error('Failed to update profile:', profileError);
            // Continue anyway - profile can be updated later
          }

          // Set pending email verification flag if needed, then navigate to home
          if (needsEmailVerification) {
            setPendingEmailVerification(true);
          }
          
          // Navigate to home - user can use app with or without verification
          router.replace('/(tabs)/home');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        router.replace('/(tabs)/home');
      }
    } catch (err) {
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
      setIsLoading(false);
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
          // Force Google to show account picker instead of auto-sign-in with existing session
          ...(provider === 'google' && {
            queryParams: { prompt: 'select_account' },
          }),
        },
      });

      if (error) throw error;

      // If we get a URL back, open it in the browser
      // The browser will redirect back to our app with the tokens
      if (data?.url) {
        if (Platform.OS === 'web') {
          // On web, use direct window redirect - WebBrowser.openAuthSessionAsync doesn't work
          if (typeof window !== 'undefined') {
            window.location.href = data.url;
          } else {
            throw new Error('Window not available for OAuth redirect');
          }
          // Don't reset isLoading - page is navigating away
        } else {
          // On mobile, use in-app browser
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingBottom: spacing.xl,
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
