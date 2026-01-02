import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ProgressIndicator, SelectableChip, ChipGrid } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, typography, spacing } from '../../theme';
import type { TradingGoal } from '@chartsignl/core';
import { TRADING_GOAL_LABELS } from '@chartsignl/core';

const GOALS: { value: TradingGoal; emoji: string }[] = [
  { value: 'fewer_fomo_trades', emoji: '🧘' },
  { value: 'clearer_entries', emoji: '🎯' },
  { value: 'better_exits', emoji: '🚪' },
  { value: 'consistent_process', emoji: '📋' },
  { value: 'manage_risk', emoji: '🛡️' },
  { value: 'reduce_stress', emoji: '😌' },
  { value: 'trade_less_win_more', emoji: '🏆' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { answers, toggleGoal } = useOnboardingStore();

  const handleContinue = () => {
    router.push('/(onboarding)/commitment');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <ProgressIndicator current={4} total={6} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>What would success look like?</Text>
          <Text style={styles.subtitle}>
            In the next 30 days, what would feel like a real win for you?
          </Text>
        </View>

        {/* Options */}
        <ChipGrid>
          {GOALS.map((goal) => (
            <SelectableChip
              key={goal.value}
              label={TRADING_GOAL_LABELS[goal.value]}
              selected={answers.goals.includes(goal.value)}
              onPress={() => toggleGoal(goal.value)}
              icon={<Text style={styles.chipEmoji}>{goal.emoji}</Text>}
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
  },
});
