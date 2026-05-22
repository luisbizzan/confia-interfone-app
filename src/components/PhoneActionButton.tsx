import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';

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
      <MaterialIcons color={disabled ? theme.colors.muted : '#ffffff'} name="call" size={26} />
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
});
