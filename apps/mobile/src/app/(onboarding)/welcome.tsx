import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components';
import { colors, typography, spacing } from '../../theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative gradient */}
      <View style={styles.gradientTop} />

      <View style={styles.content}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <Text style={styles.emoji}>📊</Text>
          <Text style={styles.title}>Levels shouldn't{'\n'}feel like guesswork</Text>
          <Text style={styles.subtitle}>
            Upload any chart. Get the key levels instantly. 
            Trade with more clarity and less stress.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            emoji="✨"
            text="AI-powered level detection"
          />
          <FeatureItem
            emoji="🎯"
            text="Support & resistance in seconds"
          />
          <FeatureItem
            emoji="🧘"
            text="Calm, focused trading"
          />
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomSection}>
        <Button
          title="Get Started"
          onPress={() => router.push('/(onboarding)/style')}
          size="lg"
          fullWidth
        />
        <Text style={styles.alreadyText}>
          Already have an account?{' '}
          <Text
            style={styles.signInLink}
            onPress={() => router.push('/(onboarding)/account')}
          >
            Sign in
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: colors.primary[50],
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.displayMd,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: spacing.md,
  },
  features: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  featureText: {
    ...typography.bodyMd,
    color: colors.neutral[700],
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  alreadyText: {
    ...typography.bodyMd,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  signInLink: {
    color: colors.primary[600],
    fontWeight: '600',
  },
});
