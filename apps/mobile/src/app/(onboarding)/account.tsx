import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Button, ProgressIndicator, GoogleLogo, AppleLogo } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { updateProfile } from '../../lib/api';
import { colors, typography, spacing, borderRadius } from '../../theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Complete auth session in browser
WebBrowser.maybeCompleteAuthSession();

// Auth flow states
type AuthStep = 'email' | 'password';
type AccountStatus = 'unknown' | 'exists' | 'new';

export default function AccountScreen() {
  const router = useRouter();
  const { answers } = useOnboardingStore();
  const { setPendingEmailVerification } = useAuthStore();
  
  // Flow state
  const [step, setStep] = useState<AuthStep>('email');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('unknown');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  // Focus password field when moving to password step
  useEffect(() => {
    if (step === 'password') {
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    }
  }, [step]);

  // Check if email exists in the system
  // Prefers backend endpoint (more reliable), falls back to client-side method
  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    try {
      // Try backend endpoint first (more reliable, avoids rate limiting)
      try {
        const response = await fetch(`${API_URL}/api/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToCheck }),
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.exists === true;
        }
      } catch (backendError) {
        console.log('Backend email check failed, falling back to client-side method:', backendError);
        // Fall through to client-side method
      }

      // Fallback: Use Supabase's signInWithPassword to check if user exists
      // This doesn't actually sign in, but tells us if user exists based on error
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToCheck,
        password: '___CHECK_ONLY___', // Intentionally wrong
      });
      
      if (error) {
        // "Invalid login credentials" = user exists but wrong password
        // "User not found" or similar = user doesn't exist
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('invalid login credentials') || 
            errorMsg.includes('invalid credentials')) {
          // User exists
          return true;
        }
        
        if (errorMsg.includes('user not found') || 
            errorMsg.includes('no user found') ||
            errorMsg.includes('email not confirmed')) {
          // User doesn't exist or unconfirmed
          return false;
        }
        
        // For other errors, assume user might exist to be safe
        // This prevents account enumeration attacks
        console.log('Email check error:', error.message);
        return false;
      }
      
      // Shouldn't get here, but if we do, user exists
      return true;
    } catch (err) {
      console.error('Error checking email:', err);
      return false;
    }
  };

  // Handle email submission - check if account exists
  const handleEmailSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsCheckingEmail(true);
    setError(null);
    
    try {
      const exists = await checkEmailExists(trimmedEmail);
      setAccountStatus(exists ? 'exists' : 'new');
      setStep('password');
    } catch (err) {
      setError('Unable to verify email. Please try again.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Handle going back to email step
  const handleBackToEmail = () => {
    setStep('email');
    setAccountStatus('unknown');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  // Handle sign in (existing user)
  const handleSignIn = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Check if user needs email verification
        if (!data.user.email_confirmed_at) {
          setPendingEmailVerification(true);
        }
        // Navigation handled by root layout auth gate
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      
      if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect password. Please try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign up (new user)
  const handleSignUp = async () => {
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpError) {
        // Check if user already exists (race condition or email check was wrong)
        if (signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('already exists')) {
          setAccountStatus('exists');
          setConfirmPassword('');
          setError('This email is already registered. Please sign in instead.');
          return;
        }
        throw signUpError;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (!data.user.email_confirmed_at) {
          setPendingEmailVerification(true);
        }

        // Save onboarding preferences to profile
        try {
          await updateProfile({
            tradingStyle: answers.tradingStyle,
            experienceLevel: answers.experienceLevel,
          });
        } catch (profileError) {
          console.warn('Failed to save profile preferences:', profileError);
          // Don't block auth flow for profile save failure
        }

        // Navigation handled by root layout auth gate
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      
      // Handle email configuration issues
      if (errorMessage.includes('confirmation email') || errorMessage.includes('Error sending')) {
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Email Configuration Error',
            'Email verification is not configured. Please contact support.',
            [{ text: 'OK' }]
          );
        }
        setError('Email service unavailable. Please try again later.');
        return;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle social auth (Google/Apple)
  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);

    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'chartsignl',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'cancel') {
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      let errorMessage = 'Authentication failed';
      
      if (err instanceof Error) {
        if (err.message.includes('Provider not enabled')) {
          errorMessage = `${provider === 'google' ? 'Google' : 'Apple'} sign-in is not configured yet.`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: AuthSession.makeRedirectUri({
          scheme: 'chartsignl',
          path: 'auth/reset-password',
        }),
      });

      if (error) throw error;

      Alert.alert(
        'Check Your Email',
        'We sent you a password reset link. Please check your inbox.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  // Render email step
  const renderEmailStep = () => (
    <>
      <Text style={styles.title}>Welcome to ChartSignl</Text>
      <Text style={styles.subtitle}>
        Enter your email to sign in or create an account
      </Text>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.neutral[400]}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={handleEmailSubmit}
          editable={!isCheckingEmail}
        />
      </View>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Continue Button */}
      <Button
        title={isCheckingEmail ? 'Checking...' : 'Continue'}
        onPress={handleEmailSubmit}
        disabled={isCheckingEmail || !email.trim()}
        style={styles.primaryButton}
      />

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social Auth Buttons */}
      <View style={styles.socialButtons}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth('google')}
          disabled={isLoading}
        >
          <GoogleLogo size={18} />
          <Text style={styles.socialButtonText}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth('apple')}
          disabled={isLoading}
        >
          <AppleLogo size={18} />
          <Text style={styles.socialButtonText}>Apple</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // Render password step (existing user - sign in)
  const renderSignInStep = () => (
    <>
      <TouchableOpacity onPress={handleBackToEmail} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.subtitle}>
        Enter your password to sign in as{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          ref={passwordInputRef}
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor={colors.neutral[400]}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
          editable={!isLoading}
        />
      </View>

      {/* Forgot Password */}
      <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
        <Text style={styles.forgotPassword}>Forgot password?</Text>
      </TouchableOpacity>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Sign In Button */}
      <Button
        title={isLoading ? 'Signing in...' : 'Sign In'}
        onPress={handleSignIn}
        disabled={isLoading || !password.trim()}
        style={styles.primaryButton}
      />

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social Auth Buttons */}
      <View style={styles.socialButtons}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth('google')}
          disabled={isLoading}
        >
          <GoogleLogo size={18} />
          <Text style={styles.socialButtonText}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth('apple')}
          disabled={isLoading}
        >
          <AppleLogo size={18} />
          <Text style={styles.socialButtonText}>Apple</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // Render password step (new user - sign up)
  const renderSignUpStep = () => (
    <>
      <TouchableOpacity onPress={handleBackToEmail} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>
        Set a password for{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          ref={passwordInputRef}
          style={styles.input}
          placeholder="Create a password (min 6 characters)"
          placeholderTextColor={colors.neutral[400]}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          editable={!isLoading}
        />
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <TextInput
          ref={confirmPasswordInputRef}
          style={styles.input}
          placeholder="Re-enter your password"
          placeholderTextColor={colors.neutral[400]}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
          editable={!isLoading}
        />
      </View>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Create Account Button */}
      <Button
        title={isLoading ? 'Creating account...' : 'Create Account'}
        onPress={handleSignUp}
        disabled={isLoading || !password.trim() || !confirmPassword.trim()}
        style={styles.primaryButton}
      />

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social Auth Buttons */}
      <View style={styles.socialButtons}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth('google')}
          disabled={isLoading}
        >
          <GoogleLogo size={18} />
          <Text style={styles.socialButtonText}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth('apple')}
          disabled={isLoading}
        >
          <AppleLogo size={18} />
          <Text style={styles.socialButtonText}>Apple</Text>
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <Text style={styles.termsText}>
        By creating an account, you agree to our{' '}
        <Text style={styles.termsLink} onPress={() => router.push('/(settings)/terms')}>
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text style={styles.termsLink} onPress={() => router.push('/(settings)/privacy')}>
          Privacy Policy
        </Text>
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.webWrapper}>
          <View style={styles.webInner}>
            {/* Progress Indicator - only show during onboarding */}
            <View style={styles.progressContainer}>
              <ProgressIndicator current={5} total={5} />
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {step === 'email' && renderEmailStep()}
              {step === 'password' && accountStatus === 'exists' && renderSignInStep()}
              {step === 'password' && accountStatus === 'new' && renderSignUpStep()}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const WEB_MAX_WIDTH = 480;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  webWrapper: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && { alignItems: 'center' }),
  },
  webInner: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && { maxWidth: WEB_MAX_WIDTH }),
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  // Back button
  backButton: {
    marginBottom: spacing.md,
  },
  backButtonText: {
    ...typography.bodyMd,
    color: colors.primary[600],
    fontWeight: '600',
  },
  // Headers
  title: {
    ...typography.displayMd,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.neutral[600],
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  emailHighlight: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  // Input styles
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.labelMd,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  input: {
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    ...typography.bodyMd,
    color: colors.neutral[900],
  },
  // Forgot password
  forgotPassword: {
    ...typography.bodySm,
    color: colors.primary[600],
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  // Error
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  // Primary button
  primaryButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  dividerText: {
    ...typography.bodySm,
    color: colors.neutral[500],
    paddingHorizontal: spacing.md,
  },
  // Social buttons
  socialButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  socialButtonIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[700],
  },
  socialButtonText: {
    ...typography.bodyMd,
    color: colors.neutral[700],
    fontWeight: '600',
  },
  // Terms
  termsText: {
    ...typography.bodySm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary[600],
    fontWeight: '500',
  },
});
