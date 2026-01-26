import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, Linking, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, Input } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, borderRadius } from '../../theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    validateResetToken();
  }, []);

  const validateResetToken = async () => {
    try {
      // Extract tokens from URL (password reset links include tokens in hash or query params)
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let tokenType: string | null = null;

      // Try to get URL from params or window location
      let url: string | null = null;
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Web: tokens are in window.location.hash or search
        url = window.location.href;
      } else {
        // Mobile: try to get from Linking or params
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && initialUrl.includes('reset-password')) {
            url = initialUrl;
          }
        } catch (e) {
          // Ignore
        }
        
        // Also check params
        if (!url && params.url) {
          url = params.url as string;
        }
      }

      // Extract tokens from URL hash or query params
      if (url) {
        try {
          // Handle hash fragments (#access_token=...)
          if (url.includes('#')) {
            const hash = url.split('#')[1];
            const hashParams = new URLSearchParams(hash);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
            tokenType = hashParams.get('type');
          }
          
          // Handle query parameters (?access_token=...)
          if (!accessToken && url.includes('?')) {
            const query = url.split('?')[1].split('#')[0];
            const queryParams = new URLSearchParams(query);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
            tokenType = queryParams.get('type');
          }

          // Also check params directly
          if (!accessToken) {
            accessToken = params.access_token as string | null;
            refreshToken = params.refresh_token as string | null;
            tokenType = params.type as string | null;
          }
        } catch (e) {
          // Ignore extraction errors
        }
      }

      // If we have tokens, set the session first
      if (accessToken) {
        const { error: sessionError, data: sessionData } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          throw sessionError;
        }

        if (sessionData?.session) {
          setIsValid(true);
          setIsValidating(false);
          return;
        }
      }

      // Fallback: try getSession (in case Supabase auto-processed the URL)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setIsValid(false);
        Alert.alert(
          'Invalid Link',
          'This password reset link is invalid or has expired. Please request a new one.',
          [{ text: 'OK', onPress: () => router.replace('/(onboarding)/forgot-password') }]
        );
      } else {
        setIsValid(true);
      }
    } catch (err) {
      console.error('Token validation error:', err);
      setIsValid(false);
      Alert.alert(
        'Invalid Link',
        'This password reset link is invalid or has expired. Please request a new one.',
        [{ text: 'OK', onPress: () => router.replace('/(onboarding)/forgot-password') }]
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleResetPassword = async () => {
    // Validation
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please enter and confirm your new password');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(onboarding)/account?mode=signin'),
          },
        ]
      );
    } catch (err) {
      console.error('Password reset error:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to reset password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Validating reset link...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isValid) {
    return null; // Alert will handle navigation
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔒</Text>
          </View>
          
          <Text style={styles.title}>Create new password</Text>
          <Text style={styles.description}>
            Your new password must be different from your previous password.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              containerStyle={{ marginTop: spacing.md }}
              returnKeyType="go"
              onSubmitEditing={handleResetPassword}
            />

            {/* Password Requirements */}
            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>Password must:</Text>
              <Text style={[
                styles.requirement,
                password.length >= 8 && styles.requirementMet,
              ]}>
                {password.length >= 8 ? '✓' : '○'} Be at least 8 characters long
              </Text>
              <Text style={[
                styles.requirement,
                password === confirmPassword && password.length > 0 && styles.requirementMet,
              ]}>
                {password === confirmPassword && password.length > 0 ? '✓' : '○'} Passwords match
              </Text>
            </View>

            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              size="lg"
              fullWidth
              loading={isLoading}
              style={{ marginTop: spacing.lg }}
              disabled={!password || !confirmPassword || password !== confirmPassword || password.length < 8}
            />
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  content: {
    flex: 1,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.neutral[600],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    ...typography.displayMd,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyMd,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  form: {
    marginTop: spacing.xl,
  },
  requirementsBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
  },
  requirementsTitle: {
    ...typography.labelMd,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  requirement: {
    ...typography.bodySm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  requirementMet: {
    color: colors.primary[600],
    fontWeight: '500',
  },
});
