import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MonthCalendar } from '@/components/month-calendar';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { today } from '@/lib/dates';

type DatePickerModalProps = {
  visible: boolean;
  title: string;
  // "YYYY-MM-DD", or null when nothing is chosen yet.
  value: string | null;
  // Days before this one cannot be picked.
  minDay?: string;
  onPick: (day: string) => void;
  onClear: () => void;
  onClose: () => void;
};

// A month calendar in a window over the screen, for picking one day.
export function DatePickerModal({ visible, title, value, minDay, onPick, onClear, onClose }: DatePickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {visible && (
        <Picker
          title={title}
          value={value}
          minDay={minDay}
          onPick={onPick}
          onClear={onClear}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function Picker({ title, value, minDay, onPick, onClear, onClose }: Omit<DatePickerModalProps, 'visible'>) {
  const [month, setMonth] = useState((value ?? minDay ?? today()).slice(0, 7));
  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגירה">
      {/* Taps inside the window do not close it. */}
      <Pressable style={styles.window} onPress={() => {}}>
        <Text variant="heading">{title}</Text>
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          selected={value}
          onSelect={(day) => {
            onPick(day);
            onClose();
          }}
          isAvailable={minDay ? (day) => day >= minDay : undefined}
          minMonth={minDay?.slice(0, 7)}
        />
        <View style={styles.actions}>
          {value ? (
            <View style={styles.grow}>
              <Button
                label="בלי תאריך"
                variant="secondary"
                onPress={() => {
                  onClear();
                  onClose();
                }}
              />
            </View>
          ) : null}
          <View style={styles.grow}>
            <Button label="ביטול" variant="secondary" onPress={onClose} />
          </View>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(26, 20, 22, 0.45)',
  },
  window: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.background,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
});
