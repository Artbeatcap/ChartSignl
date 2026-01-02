import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ProgressIndicator, SelectableChip, ChipGrid } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, typography, spacing } from '../../theme';
import type { PainPoint } from '@chartsignl/core';
import { PAIN_POINT_LABELS } from '@chartsignl/core';

const PAIN_POINTS: { value: PainPoint; emoji: string }[] = [
  { value: 'missing_breakouts', emoji: '😤' },
  { value: 'buying_tops', emoji: '📉' },
  { value: 'selling_bottoms', emoji: '😰' },
  { value: 'unclear_exits', emoji: '🤷' },
  { value: 'overtrading', emoji: '🔄' },
  { value: 'fomo', emoji: '😱' },
  { value: 'revenge_trading', emoji: '😠' },
  { value: 'analysis_paralysis', emoji: '🤯' },
];

export default function PainPointsScreen() {
  const router = useRouter();
  const { answers, togglePainPoint } = useOnboardingStore();

  const handleContinue = () => {
    router.push('/(onboarding)/goals');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <ProgressIndicator current={3} total={6} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>What frustrates you most?</Text>
          <Text style={styles.subtitle}>
            Be honest. Understanding your challenges helps us help you better.
          </Text>
        </View>

        {/* Options */}
        <ChipGrid>
          {PAIN_POINTS.map((point) => (
            <SelectableChip
              key={point.value}
              label={PAIN_POINT_LABELS[point.value]}
              selected={answers.painPoints.includes(point.value)}
              onPress={() => togglePainPoint(point.value)}
              icon={<Text style={styles.chipEmoji}>{point.emoji}</Text>}
            />
          ))}
        </ChipGrid>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomSection}>
        <Button
          title="Continue"
          onPress={handleContinue}
          size="lg"
          fullWidth
        />
        <TouchableOpacity onPress={handleContinue}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
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
  chipEmoji: {
    fontSize: 24,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  skipText: {
    ...typography.bodyMd,
    color: colors.neutral[500],
  },
});
