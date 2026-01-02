import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ProgressIndicator, Card } from '../../components';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, typography, spacing, borderRadius } from '../../theme';

const DEFAULT_COMMITMENT = "I commit to trading with clarity, not emotion. I will use ChartSignl to understand the levels before I act.";

export default function CommitmentScreen() {
  const router = useRouter();
  const { answers, setCommitment, setDisplayName } = useOnboardingStore();
  const [customCommitment, setCustomCommitment] = useState(DEFAULT_COMMITMENT);

  const handleContinue = () => {
    setCommitment(customCommitment);
    router.push('/(onboarding)/account');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <ProgressIndicator current={5} total={6} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.emoji}>🤝</Text>
          <Text style={styles.title}>Make it personal</Text>
          <Text style={styles.subtitle}>
            A commitment to yourself is powerful. Write something that resonates with you.
          </Text>
        </View>

        {/* Name input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.neutral[400]}
            value={answers.displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        </View>

        {/* Commitment card */}
        <Card style={styles.commitmentCard}>
          <Text style={styles.commitmentLabel}>Your commitment</Text>
          <TextInput
            style={styles.commitmentInput}
            multiline
            placeholder="Write your personal commitment..."
            placeholderTextColor={colors.neutral[400]}
            value={customCommitment}
            onChangeText={setCustomCommitment}
            textAlignVertical="top"
          />
        </Card>

        {/* Suggestion chips */}
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsLabel}>Or try one of these:</Text>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => setCustomCommitment("I will check the levels before entering any trade.")}
          >
            <Text style={styles.suggestionText}>📊 Check levels first</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => setCustomCommitment("I will trade with less emotion and more clarity.")}
          >
            <Text style={styles.suggestionText}>🧘 Trade with clarity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => setCustomCommitment("I will not revenge trade. I will wait for clear setups.")}
          >
            <Text style={styles.suggestionText}>🎯 Wait for setups</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomSection}>
        <Button
          title="Almost done"
          onPress={handleContinue}
          size="lg"
          fullWidth
          disabled={!answers.displayName.trim()}
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
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.displaySm,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
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
  commitmentCard: {
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[200],
    marginBottom: spacing.lg,
  },
  commitmentLabel: {
    ...typography.labelMd,
    color: colors.primary[700],
    marginBottom: spacing.sm,
  },
  commitmentInput: {
    minHeight: 120,
    ...typography.bodyMd,
    color: colors.neutral[800],
    lineHeight: 24,
  },
  suggestions: {
    gap: spacing.sm,
  },
  suggestionsLabel: {
    ...typography.labelSm,
    color: colors.neutral[500],
    marginBottom: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionText: {
    ...typography.bodySm,
    color: colors.neutral[600],
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
