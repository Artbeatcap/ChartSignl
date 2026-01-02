import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { colors, typography } from '../theme';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading, isInitialized, session } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    // Navigate based on auth state
    if (session) {
      // User is logged in - go to main app
      router.replace('/(tabs)/home');
    } else {
      // No session - show onboarding
      router.replace('/(onboarding)/welcome');
    }
  }, [isInitialized, isLoading, session, router]);

  return (
    <View style={styles.container}>
      {/* Soft gradient background */}
      <View style={styles.gradientTop} />
      
      {/* Logo/Brand */}
      <View style={styles.content}>
        <Text style={styles.logo}>ChartSignl</Text>
        <Text style={styles.tagline}>See the levels clearly</Text>
      </View>

      {/* Loading indicator */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: colors.primary[50],
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    ...typography.displayLg,
    color: colors.primary[600],
    marginBottom: 8,
  },
  tagline: {
    ...typography.bodyLg,
    color: colors.neutral[500],
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
  },
});
