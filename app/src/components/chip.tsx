import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

// A toggle for multi-select options in forms.
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={[styles.chip, selected && styles.selected]}>
      <Text variant="small" style={selected && styles.selectedText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selected: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  selectedText: {
    color: Colors.onInk,
    fontFamily: Fonts.bold,
  },
});
