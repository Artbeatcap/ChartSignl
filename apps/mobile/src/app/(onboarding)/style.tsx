import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ProgressIndicator } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import type { TradingStyle } from '@chartsignl/core';
import { TRADING_STYLE_LABELS } from '@chartsignl/core';

const STYLES: { value: TradingStyle; emoji: string; description: string }[] = [
  {
    value: 'scalper',
    emoji: '⚡',
    description: 'Quick trades, minutes at a time',
  },
  {
    value: 'day',
    emoji: '☀️',
    description: 'In and out within the day',
  },
  {
    value: 'swing',
    emoji: '🌊',
    description: 'Hold for days to catch moves',
  },
  {
    value: 'position',
    emoji: '🏔️',
    description: 'Ride trends for weeks',
  },
  {
    value: 'long_term',
    emoji: '🌳',
    description: 'Patient investing, months or years',
  },
];

export default function StyleScreen() {
  const router = useRouter();
  const { answers, setTradingStyle } = useOnboardingStore();

  const handleContinue = () => {
    router.push('/(onboarding)/instruments');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <ProgressIndicator current={1} total={6} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>How do you trade?</Text>
          <Text style={styles.subtitle}>
            This helps us show levels that matter for your timeframe.
          </Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {STYLES.map((style) => (
            <TouchableOpacity
              key={style.value}
              style={[
                styles.option,
                answers.tradingStyle === style.value && styles.optionSelected,
              ]}
              onPress={() => setTradingStyle(style.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{style.emoji}</Text>
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionTitle,
                    answers.tradingStyle === style.value && styles.optionTitleSelected,
                  ]}
                >
                  {TRADING_STYLE_LABELS[style.value]}
                </Text>
                <Text style={styles.optionDescription}>{style.description}</Text>
              </View>
              {answers.tradingStyle === style.value && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomSection}>
        <Button
          title="Continue"
          onPress={handleContinue}
          size="lg"
          fullWidth
          disabled={!answers.tradingStyle}
        />
      </View>
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
  options: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  optionSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...typography.headingSm,
    color: colors.neutral[800],
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: colors.primary[700],
  },
  optionDescription: {
    ...typography.bodySm,
    color: colors.neutral[500],
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
