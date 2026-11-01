import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { MonthCalendar } from '@/components/month-calendar';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { addTimeOff, errorText, TIME_OFF_TEXT, type TimeOff } from '@/lib/appointments';
import { dayLabel, monthOf, today } from '@/lib/dates';
import { parseTime } from '@/lib/hours';

const KINDS: TimeOff['kind'][] = ['break', 'vacation', 'other'];

// The pro blocks time (a break, a day off) so clients cannot book it.
export default function BlockTimeScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const initialDay = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : today();
  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(() => monthOf(initialDay));
  const [wholeDay, setWholeDay] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState<TimeOff['kind']>('break');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = parseTime(from);
  const end = parseTime(to);
  const rangeProblem =
    !wholeDay && start && end && end <= start ? 'שעת הסיום צריכה להיות אחרי שעת ההתחלה.' : null;
  const ready = wholeDay || (start !== null && end !== null && !rangeProblem);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await addTimeOff({ day, from: wholeDay ? null : start, to: wholeDay ? null : end, kind, note });
      router.back();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="title">חסימת זמן</Text>
      <Text muted>בזמן החסום לקוחות לא יוכלו לקבוע תור. תורים שכבר נקבעו לא מתבטלים.</Text>

      <View style={styles.section}>
        <MonthCalendar
          month={month}
          onMonthChange={(m) => {
            setMonth(m);
            setDay(monthOf(today()) === m ? today() : `${m}-01`);
          }}
          minMonth={monthOf(today())}
          selected={day}
          onSelect={setDay}
          isAvailable={(d) => d >= today()}
        />
        <Text variant="smallBold">{dayLabel(day)}</Text>
        <View style={styles.chips}>
          <Chip label="חלק מהיום" selected={!wholeDay} onPress={() => setWholeDay(false)} />
          <Chip label="כל היום" selected={wholeDay} onPress={() => setWholeDay(true)} />
        </View>
        {!wholeDay && (
          <View style={styles.range}>
            <View style={styles.grow}>
              <TextField
                label="מ-"
                ltr
                value={from}
                onChangeText={setFrom}
                onBlur={() => start && setFrom(start)}
                keyboardType="numbers-and-punctuation"
                placeholder="13:00"
              />
            </View>
            <View style={styles.grow}>
              <TextField
                label="עד"
                ltr
                value={to}
                onChangeText={setTo}
                onBlur={() => end && setTo(end)}
                keyboardType="numbers-and-punctuation"
                placeholder="14:00"
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="heading">סוג</Text>
        <View style={styles.chips}>
          {KINDS.map((k) => (
            <Chip key={k} label={TIME_OFF_TEXT[k]} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
        <TextField label="הערה לעצמך (לא חובה)" value={note} onChangeText={setNote} />
      </View>

      {rangeProblem || error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {rangeProblem ?? error}
        </Text>
      ) : null}
      <Button label="חסימה" onPress={save} disabled={!ready} busy={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  range: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  error: {
    color: Colors.accentPressed,
  },
});
