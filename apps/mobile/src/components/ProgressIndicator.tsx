import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors, typography } from '../theme';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

export function ProgressIndicator({
  current,
  total,
  showLabel = true,
}: ProgressIndicatorProps) {
  const progress = (current / total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={[styles.bar, { width: `${progress}%` }]} />
      </View>
      {showLabel && (
        <Text style={styles.label}>
          {current} of {total}
        </Text>
      )}
    </View>
  );
}

// Dot-style indicator (alternative)
interface DotIndicatorProps {
  current: number;
  total: number;
}

export function DotIndicator({ current, total }: DotIndicatorProps) {
  return (
    <View style={styles.dotContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && styles.dotActive,
            i < current && styles.dotCompleted,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 3,
  },
  label: {
    ...typography.labelSm,
    color: colors.neutral[500],
  },
  // Dot styles
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary[500],
  },
  dotCompleted: {
    backgroundColor: colors.primary[300],
  },
});
