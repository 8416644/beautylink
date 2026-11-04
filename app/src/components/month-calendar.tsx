import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { addMonths, daysOfMonth, monthLabel, today, WEEKDAY_LETTERS, weekdayOf } from '@/lib/dates';

type MonthCalendarProps = {
  month: string; // "YYYY-MM"
  onMonthChange: (month: string) => void;
  selected: string | null;
  onSelect: (day: string) => void;
  // A day with nothing to choose is shown faded and cannot be picked.
  isAvailable?: (day: string) => boolean;
  // A small dot under the day, in this color (for example, a day that has appointments).
  dotColor?: (day: string) => string | null;
  // The earliest and latest months she can move to.
  minMonth?: string;
  maxMonth?: string;
};

// A month at a time, Sunday to Saturday, with arrows to the months before and after.
// Rows follow the app's right-to-left layout, so Sunday is on the right.
export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  isAvailable,
  dotColor,
  minMonth,
  maxMonth,
}: MonthCalendarProps) {
  const now = today();
  const days = daysOfMonth(month);
  const cells: (string | null)[] = [...Array(weekdayOf(days[0])).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const canGoBack = !minMonth || month > minMonth;
  const canGoForward = !maxMonth || month < maxMonth;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Arrow
          label="›"
          accessibilityLabel="החודש הקודם"
          enabled={canGoBack}
          onPress={() => onMonthChange(addMonths(month, -1))}
        />
        <Text variant="heading" style={styles.title}>
          {monthLabel(month)}
        </Text>
        <Arrow
          label="‹"
          accessibilityLabel="החודש הבא"
          enabled={canGoForward}
          onPress={() => onMonthChange(addMonths(month, 1))}
        />
      </View>

      <View style={styles.week}>
        {WEEKDAY_LETTERS.map((letter) => (
          <View key={letter} style={styles.cell}>
            <Text variant="caption" muted style={styles.center}>
              {letter}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((day, d) => {
            if (!day) return <View key={d} style={styles.cell} />;
            const available = isAvailable ? isAvailable(day) : true;
            const active = day === selected;
            const dot = dotColor?.(day) ?? null;
            return (
              <View key={day} style={styles.cell}>
                <Pressable
                  onPress={() => onSelect(day)}
                  disabled={!available}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: !available }}
                  accessibilityLabel={day === now ? `היום, ${Number(day.slice(8))}` : String(Number(day.slice(8)))}
                  style={[
                    styles.day,
                    day === now && styles.today,
                    active && styles.active,
                    !available && styles.unavailable,
                  ]}>
                  <Text variant={active || day === now ? 'smallBold' : 'small'} style={[styles.center, active && styles.activeText]}>
                    {Number(day.slice(8))}
                  </Text>
                  <View style={[styles.dot, dot !== null && { backgroundColor: active ? Colors.surface : dot }]} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Arrow({
  label,
  accessibilityLabel,
  enabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      style={[styles.arrow, !enabled && styles.unavailable]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !enabled }}>
      <Text variant="title" style={[styles.center, styles.arrowText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  arrow: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: Colors.accent,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  day: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  active: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  activeText: {
    color: Colors.surface,
  },
  unavailable: {
    opacity: 0.3,
  },
  center: {
    textAlign: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 1,
  },
});
