import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { theme } from '../theme/theme';

type PhoneActionButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

export function PhoneActionButton({
  accessibilityLabel,
  disabled = false,
  onPress,
  testID,
}: PhoneActionButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
      testID={testID}
      onPress={onPress}
    >
      <Text style={[styles.icon, disabled && styles.disabledIcon]}>☎</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  disabled: {
    backgroundColor: '#e5e7eb',
  },
  icon: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
  },
  disabledIcon: {
    color: theme.colors.muted,
  },
});
