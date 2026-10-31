import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchWorkingHours, parseTime, saveWorkingHours, WEEKDAYS, type Shift } from '@/lib/hours';
import { fetchOwnProProfile } from '@/lib/pro-account';
import { useAsync } from '@/lib/use-async';

// A day as she edits it: the times stay as typed until she saves.
type Range = { start: string; end: string };
type Day = { open: boolean; ranges: Range[] };

const DEFAULT_RANGE: Range = { start: '09:00', end: '18:00' };

// Where a pro sets the days and hours she works each week.
export default function MyHoursScreen() {
  const { loading, session } = useAuth();
  const userId = session?.user.id ?? null;

  const { state, reload } = useAsync(userId, async () => {
    const [pro, shifts] = await Promise.all([fetchOwnProProfile(userId!), fetchWorkingHours(userId!)]);
    return { pro, shifts };
  });

  if (loading) return <Screen>{null}</Screen>;

  if (!userId) {
    return (
      <Screen>
        <Text variant="title">שעות העבודה שלי</Text>
        <Card>
          <Text>כדי להגדיר שעות עבודה צריך קודם להתחבר.</Text>
        </Card>
        <Button label="התחברות" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Card>
          <Text muted>לא הצלחנו לטעון את שעות העבודה. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </Card>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const { pro, shifts } = state.data;

  if (!pro) {
    return (
      <Screen>
        <Text variant="title">שעות העבודה שלי</Text>
        <Card>
          <Text>קודם מצטרפים כבעלת מקצוע, ואחר כך מגדירים שעות עבודה.</Text>
        </Card>
        <Button label="הצטרפות כבעלת מקצוע" onPress={() => router.replace('/pro-signup')} />
      </Screen>
    );
  }

  if (pro.status === 'suspended') {
    return (
      <Screen>
        <Text variant="title">שעות העבודה שלי</Text>
        <Card>
          <Text>הפרופיל המקצועי שלך מושהה כרגע. לפרטים אפשר לפנות לצוות BeautyLink.</Text>
        </Card>
      </Screen>
    );
  }

  return <HoursEditor proId={userId} shifts={shifts} />;
}

function toDays(shifts: Shift[]): Day[] {
  return WEEKDAYS.map((_, weekday) => {
    const ranges = shifts
      .filter((s) => s.weekday === weekday)
      .map((s) => ({ start: s.start, end: s.end }));
    return { open: ranges.length > 0, ranges: ranges.length > 0 ? ranges : [DEFAULT_RANGE] };
  });
}

// Checks one open day. Returns its shifts, or what is wrong with it.
function checkDay(day: Day, weekday: number): { shifts: Shift[] } | { problem: string } {
  const shifts: Shift[] = [];
  for (const range of day.ranges) {
    const start = parseTime(range.start);
    const end = parseTime(range.end);
    if (!start || !end) return { problem: 'שעה לא תקינה. כותבים למשל 09:00' };
    if (end <= start) return { problem: 'שעת הסיום צריכה להיות אחרי שעת ההתחלה' };
    shifts.push({ weekday, start, end });
  }
  shifts.sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < shifts.length; i++) {
    if (shifts[i].start < shifts[i - 1].end) return { problem: 'יש שעות שחופפות זו לזו' };
  }
  return { shifts };
}

function HoursEditor({ proId, shifts }: { proId: string; shifts: Shift[] }) {
  const [days, setDays] = useState<Day[]>(() => toDays(shifts));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState<number | null>(null);

  function update(weekday: number, change: (day: Day) => Day) {
    setSaved(false);
    setCopiedFrom(null);
    setDays((all) => all.map((day, i) => (i === weekday ? change(day) : day)));
  }

  function setTime(weekday: number, index: number, field: keyof Range, value: string) {
    update(weekday, (day) => ({
      ...day,
      ranges: day.ranges.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }));
  }

  // Tidies a time she typed, such as "9" into "09:00", when she leaves the field.
  function tidyTime(weekday: number, index: number, field: keyof Range) {
    const parsed = parseTime(days[weekday].ranges[index][field]);
    if (parsed) setTime(weekday, index, field, parsed);
  }

  // Opens every other day of the week with this day's hours; she then closes the days she
  // does not work.
  function copyToWeek(from: number) {
    setSaved(false);
    setCopiedFrom(from);
    setDays((all) =>
      all.map((day, i) => (i === from ? day : { open: true, ranges: all[from].ranges.map((r) => ({ ...r })) })),
    );
  }

  const checks = days.map((day, weekday) => (day.open ? checkDay(day, weekday) : { shifts: [] }));
  const problems = checks.flatMap((check, weekday) =>
    'problem' in check ? [`יום ${WEEKDAYS[weekday]}: ${check.problem}`] : [],
  );

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveWorkingHours(
        proId,
        checks.flatMap((check) => ('shifts' in check ? check.shifts : [])),
      );
      setSaved(true);
    } catch {
      setError('לא הצלחנו לשמור. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="title">שעות העבודה שלי</Text>
      <Text muted>
        בוחרים באילו ימים את עובדת ובאילו שעות. לקוחות יוכלו לקבוע תור רק בשעות האלה.
      </Text>

      {days.map((day, weekday) => (
        <View key={weekday} style={[styles.card, !day.open && styles.closed]}>
          <View style={styles.dayHeader}>
            <Text variant="heading" style={styles.grow}>
              {WEEKDAYS[weekday]}
            </Text>
            <Chip
              label={day.open ? 'עובדת' : 'לא עובדת'}
              selected={day.open}
              onPress={() => update(weekday, (d) => ({ ...d, open: !d.open }))}
            />
          </View>

          {day.open && (
            <>
              {day.ranges.map((range, index) => (
                <View key={index} style={styles.range}>
                  <View style={styles.grow}>
                    <TextField
                      label="מ-"
                      ltr
                      value={range.start}
                      onChangeText={(v) => setTime(weekday, index, 'start', v)}
                      onBlur={() => tidyTime(weekday, index, 'start')}
                      keyboardType="numbers-and-punctuation"
                      placeholder="09:00"
                    />
                  </View>
                  <View style={styles.grow}>
                    <TextField
                      label="עד"
                      ltr
                      value={range.end}
                      onChangeText={(v) => setTime(weekday, index, 'end', v)}
                      onBlur={() => tidyTime(weekday, index, 'end')}
                      keyboardType="numbers-and-punctuation"
                      placeholder="18:00"
                    />
                  </View>
                  {day.ranges.length > 1 && (
                    <Pressable
                      style={styles.remove}
                      onPress={() =>
                        update(weekday, (d) => ({ ...d, ranges: d.ranges.filter((_, i) => i !== index) }))
                      }
                      accessibilityRole="button"
                      accessibilityLabel="הסרת השעות האלה">
                      <Text variant="smallBold" style={styles.link}>
                        הסרה
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
              <View style={styles.chips}>
                <Chip
                  label="הוספת שעות (למשל אחרי הפסקה)"
                  selected={false}
                  onPress={() =>
                    update(weekday, (d) => ({ ...d, ranges: [...d.ranges, { start: '', end: '' }] }))
                  }
                />
                <Chip label="העתקה לכל ימי השבוע" selected={false} onPress={() => copyToWeek(weekday)} />
              </View>
              {copiedFrom === weekday && (
                <View style={styles.notice}>
                  <Text variant="small" style={styles.noticeText}>
                    השעות הועתקו לכל ימי השבוע. בימים שאת לא עובדת בהם, לוחצים &quot;עובדת&quot;
                    כדי לסגור אותם, ואחר כך שומרים.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      ))}

      {problems.map((problem) => (
        <Text key={problem} variant="small" style={styles.error}>
          {problem}
        </Text>
      ))}
      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {saved ? (
        <View style={styles.notice}>
          <Text variant="small" style={styles.noticeText}>
            שעות העבודה נשמרו.
          </Text>
        </View>
      ) : null}
      <Button label="שמירה" onPress={save} disabled={problems.length > 0} busy={busy} />
    </Screen>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closed: {
    backgroundColor: Colors.background,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  range: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  remove: {
    minHeight: 48,
    justifyContent: 'center',
  },
  link: {
    color: Colors.accent,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  error: {
    color: Colors.accentPressed,
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Radius.small,
    backgroundColor: Colors.secondaryTint,
  },
  noticeText: {
    color: Colors.secondaryOnTint,
  },
});
