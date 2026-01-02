import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ProgressIndicator, SelectableChip, ChipGrid } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, typography, spacing } from '../../theme';
import type { InstrumentType } from '@chartsignl/core';
import { INSTRUMENT_LABELS } from '@chartsignl/core';

const INSTRUMENTS: { value: InstrumentType; emoji: string }[] = [
  { value: 'stocks', emoji: '📈' },
  { value: 'options', emoji: '🎯' },
  { value: 'futures', emoji: '📊' },
  { value: 'crypto', emoji: '🪙' },
  { value: 'forex', emoji: '💱' },
];

export default function InstrumentsScreen() {
  const router = useRouter();
  const { answers, toggleInstrument } = useOnboardingStore();

  const handleContinue = () => {
    router.push('/(onboarding)/pain-points');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <ProgressIndicator current={2} total={6} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>What do you trade?</Text>
          <Text style={styles.subtitle}>
            Select all that apply. We'll tailor the analysis to your markets.
          </Text>
        </View>

        {/* Options */}
        <ChipGrid>
          {INSTRUMENTS.map((instrument) => (
            <SelectableChip
              key={instrument.value}
              label={INSTRUMENT_LABELS[instrument.value]}
              selected={answers.instruments.includes(instrument.value)}
              onPress={() => toggleInstrument(instrument.value)}
              icon={<Text style={styles.chipEmoji}>{instrument.emoji}</Text>}
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
          disabled={answers.instruments.length === 0}
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
