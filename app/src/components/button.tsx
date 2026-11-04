import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  busy?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled, busy }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        (disabled || busy) && styles.disabled,
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? Colors.onInk : Colors.ink} />
      ) : (
        <Text variant="smallBold" style={primary ? styles.primaryText : styles.secondaryText}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The main action is ink; everything else stays light.
  primary: {
    backgroundColor: Colors.ink,
  },
  primaryPressed: {
    backgroundColor: Colors.inkPressed,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryPressed: {
    backgroundColor: Colors.accentTint,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: Colors.onInk,
    textAlign: 'center',
  },
  secondaryText: {
    color: Colors.ink,
    textAlign: 'center',
  },
});
