import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, borderRadius, typography, shadows } from '../theme';

interface SelectableChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}

export function SelectableChip({
  label,
  selected,
  onPress,
  icon,
}: SelectableChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
      {selected && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Grid layout for multiple chips
interface ChipGridProps {
  children: React.ReactNode;
}

export function ChipGrid({ children }: ChipGridProps) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...shadows.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  iconContainer: {
    marginRight: 12,
  },
  label: {
    ...typography.bodyMd,
    color: colors.neutral[700],
    flex: 1,
  },
  labelSelected: {
    color: colors.primary[700],
    fontWeight: '500',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    width: '100%',
  },
});
