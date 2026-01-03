import { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, ProgressIndicator, Input } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { supabase } from '../../lib/supabase';
import { updateProfile } from '../../lib/api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

type AuthMode = 'signup' | 'signin';

export default function AccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: AuthMode }>();
  const { answers } = useOnboardingStore();
  
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

        if (signUpError) throw signUpError;

        if (data.user) {
          // Check if email confirmation is required
          if (!data.session) {
            Alert.alert(
              'Verify your email',
              'Please check your email and click the confirmation link to complete signup.',
              [{ text: 'OK' }]
            );
            return;
          }

          // Wait a moment for session to be persisted to storage
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Save onboarding data to profile
          try {
            await updateProfile({
              display_name: answers.displayName,
              trading_style: answers.tradingStyle,
              instruments: answers.instruments,
              pain_points: answers.painPoints,
              goals: answers.goals,
              commitment: answers.commitment,
              onboarding_completed: true,
            });
          } catch (profileError) {
            console.error('Failed to update profile:', profileError);
            // Continue anyway - user is signed up
            Alert.alert(
              'Profile Update',
              'Account created but profile update failed. You can update it later.',
              [{ text: 'OK' }]
            );
          }

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
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'chartsignl://auth/callback',
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
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
        {mode === 'signup' && <ProgressIndicator current={6} total={6} />}
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
