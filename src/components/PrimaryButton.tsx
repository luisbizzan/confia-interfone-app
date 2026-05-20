import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { theme } from '../theme/theme';

type PrimaryButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: 'primary' | 'danger' | 'neutral';
};

export function PrimaryButton({ disabled = false, label, onPress, testID, tone = 'primary' }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.button, tone === 'danger' && styles.danger, tone === 'neutral' && styles.neutral, disabled && styles.disabled]}
      testID={testID}
      onPress={onPress}
    >
      <Text style={[styles.label, tone === 'neutral' && styles.neutralLabel, disabled && styles.disabledLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  neutral: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  disabled: {
    backgroundColor: '#e5e7eb',
    borderColor: '#d1d5db',
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  neutralLabel: {
    color: theme.colors.text,
  },
  disabledLabel: {
    color: theme.colors.muted,
  },
});
