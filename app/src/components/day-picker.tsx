import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { shortDate, today, WEEKDAY_LETTERS, weekdayOf } from '@/lib/dates';

type DayPickerProps = {
  days: string[];
  selected: string | null;
  onSelect: (day: string) => void;
  // A day with nothing to choose is shown faded and cannot be picked.
  isAvailable?: (day: string) => boolean;
};

// A row of days that scrolls sideways: the weekday letter above the date.
export function DayPicker({ days, selected, onSelect, isAvailable }: DayPickerProps) {
  const now = today();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {days.map((day) => {
        const available = isAvailable ? isAvailable(day) : true;
        const active = day === selected;
        return (
          <Pressable
            key={day}
            onPress={() => onSelect(day)}
            disabled={!available}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: !available }}
            accessibilityLabel={`${day === now ? 'היום' : `יום ${WEEKDAY_LETTERS[weekdayOf(day)]}`} ${shortDate(day)}`}
            style={[styles.day, active && styles.active, !available && styles.unavailable]}>
            <Text variant="caption" style={[styles.center, active && styles.activeText]}>
              {day === now ? 'היום' : WEEKDAY_LETTERS[weekdayOf(day)]}
            </Text>
            <Text variant="smallBold" style={[styles.center, active && styles.activeText]}>
              {shortDate(day)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  day: {
    width: 56,
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  active: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  unavailable: {
    opacity: 0.4,
  },
  center: {
    textAlign: 'center',
  },
  activeText: {
    color: Colors.surface,
  },
});
