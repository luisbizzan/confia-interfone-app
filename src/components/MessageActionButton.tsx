import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../theme/theme';

type MessageActionButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
  unreadCount?: number;
};

export function MessageActionButton({
  accessibilityLabel,
  disabled = false,
  onPress,
  testID,
  unreadCount = 0,
}: MessageActionButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
      testID={testID}
      onPress={onPress}
    >
      <MaterialIcons color={disabled ? theme.colors.muted : theme.colors.primary} name="chat-bubble" size={22} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#eef5ff',
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    width: 48,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 2,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    position: 'absolute',
    right: -4,
    top: -5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  disabled: {
    backgroundColor: '#e5e7eb',
  },
});
