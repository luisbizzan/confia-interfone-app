import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { theme } from '../theme/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger' | 'neutral';
};

export function PrimaryButton({ label, onPress, tone = 'primary' }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.button, tone === 'danger' && styles.danger, tone === 'neutral' && styles.neutral]}
      onPress={onPress}
    >
      <Text style={[styles.label, tone === 'neutral' && styles.neutralLabel]}>{label}</Text>
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
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  neutralLabel: {
    color: theme.colors.text,
  },
});
