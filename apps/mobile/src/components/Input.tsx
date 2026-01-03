import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  containerStyle,
  style,
  ...props
}, ref) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={ref}
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.neutral[400]}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  inputError: {
    borderColor: colors.error,
  },
  error: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.bodySm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
});
