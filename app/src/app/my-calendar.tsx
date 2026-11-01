import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { MonthCalendar } from '@/components/month-calendar';
import { Screen } from '@/components/screen';
import { StatusBadge } from '@/components/status-badge';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  cancelAppointment,
  cancellationPolicy,
  deleteTimeOff,
  errorText,
  fetchAgenda,
  fetchBookingSettings,
  fetchPendingRequests,
  saveBookingSettings,
  setAppointmentStatus,
  TIME_OFF_TEXT,
  type AppointmentStatus,
  type BookingSettings,
  type ProAppointment,
  type TimeOff,
} from '@/lib/appointments';
import { useAuth } from '@/lib/auth';
import { dayLabel, daysOfMonth, inIsrael, ltr, monthOf, today, weekdayOf } from '@/lib/dates';
import { fetchWorkingHours, formatShifts, type Shift } from '@/lib/hours';
import { fetchOwnProProfile } from '@/lib/pro-account';
import { formatPrice } from '@/lib/services';
import { useAsync } from '@/lib/use-async';
import { useReloadOnFocus } from '@/lib/use-reload-on-focus';

// The pro's calendar: requests waiting for her, one day at a time, and her booking rules.
export default function MyCalendarScreen() {
  const { loading, session } = useAuth();
  const userId = session?.user.id ?? null;

  const { state, reload } = useAsync(userId, async () => {
    const [pro, settings, hours] = await Promise.all([
      fetchOwnProProfile(userId!),
      fetchBookingSettings(userId!),
      fetchWorkingHours(userId!),
    ]);
    return { pro, settings, hours };
  });

  if (loading) return <Screen>{null}</Screen>;

  if (!userId) {
    return (
      <Screen>
        <Text variant="title">היומן שלי</Text>
        <View style={styles.card}>
          <Text>כדי לראות את היומן צריך קודם להתחבר.</Text>
        </View>
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
        <View style={styles.card}>
          <Text muted>לא הצלחנו לטעון את היומן. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </View>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const { pro, settings, hours } = state.data;

  if (!pro || !settings) {
    return (
      <Screen>
        <Text variant="title">היומן שלי</Text>
        <View style={styles.card}>
          <Text>קודם מצטרפים כבעלת מקצוע, ואחר כך היומן נפתח.</Text>
        </View>
        <Button label="הצטרפות כבעלת מקצוע" onPress={() => router.replace('/pro-signup')} />
      </Screen>
    );
  }

  if (pro.status === 'suspended') {
    return (
      <Screen>
        <Text variant="title">היומן שלי</Text>
        <View style={styles.card}>
          <Text>הפרופיל המקצועי שלך מושהה כרגע. לפרטים אפשר לפנות לצוות BeautyLink.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Calendar
      proId={userId}
      approved={pro.status === 'approved'}
      settings={settings}
      hours={hours}
      onReloadAll={reload}
    />
  );
}

type CalendarProps = {
  proId: string;
  approved: boolean;
  settings: BookingSettings;
  hours: Shift[];
  onReloadAll: () => void;
};

function Calendar({ proId, approved, settings, hours, onReloadAll }: CalendarProps) {
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(() => monthOf(today()));

  const { state: pendingState, reload: reloadPending } = useAsync(proId, () => fetchPendingRequests(proId));
  // The whole month at once, so the calendar can mark the days that have appointments.
  const { state: agendaState, reload: reloadAgenda } = useAsync(`${proId}:${month}`, () =>
    fetchAgenda(proId, `${month}-01`, daysOfMonth(month).length),
  );

  function reload() {
    reloadPending();
    reloadAgenda();
  }
  useReloadOnFocus(() => {
    reload();
    onReloadAll();
  });

  const pending = pendingState.status === 'ready' ? pendingState.data : [];
  const agenda = agendaState.status === 'ready' ? agendaState.data : null;
  const onDay = (d: string) => ({
    appointments: (agenda?.appointments ?? []).filter((a) => inIsrael(a.starts_at).day === d),
    blocks: (agenda?.blocks ?? []).filter(
      (b) => inIsrael(b.starts_at).day <= d && d <= inIsrael(new Date(new Date(b.ends_at).getTime() - 1)).day,
    ),
  });
  const dotColor = (d: string) => {
    const { appointments, blocks } = onDay(d);
    if (appointments.some((a) => a.status === 'pending' || a.status === 'confirmed')) return Colors.accent;
    if (appointments.length > 0 || blocks.length > 0) return Colors.textSecondary;
    return null;
  };
  const selectedDay = onDay(day);

  function changeMonth(next: string) {
    setMonth(next);
    setDay(monthOf(today()) === next ? today() : `${next}-01`);
  }
  const shifts = hours.filter((s) => s.weekday === weekdayOf(day));

  return (
    <Screen>
      <Text variant="title">היומן שלי</Text>

      {!approved && (
        <View style={[styles.card, styles.notice]}>
          <Text variant="small" style={styles.noticeText}>
            הפרופיל שלך עוד לא אושר, ולכן לקוחות לא יכולות לקבוע תור דרך האפליקציה. בינתיים אפשר
            להוסיף תורים ידניים ולחסום זמן.
          </Text>
        </View>
      )}
      {hours.length === 0 && (
        <View style={[styles.card, styles.notice]}>
          <Text variant="small" style={styles.noticeText}>
            עוד לא הגדרת שעות עבודה, ולכן אין שעות פנויות לקביעת תור.
          </Text>
          <Button label="הגדרת שעות עבודה" variant="secondary" onPress={() => router.push('/my-hours')} />
        </View>
      )}

      {pending.length > 0 && (
        <View style={styles.section}>
          <Text variant="heading">מחכות לאישור שלך ({pending.length})</Text>
          {pending.map((a) => (
            <AppointmentItem key={a.id} appointment={a} showDay onChanged={reload} />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <MonthCalendar
          month={month}
          onMonthChange={changeMonth}
          selected={day}
          onSelect={setDay}
          dotColor={dotColor}
        />
        <Text variant="heading">{dayLabel(day)}</Text>
        <Text variant="small" muted>
          {shifts.length > 0 ? `שעות עבודה: ${formatShifts(shifts)}` : 'לא יום עבודה לפי השעות שלך'}
        </Text>

        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button label="הוספת תור" onPress={() => router.push({ pathname: '/add-appointment', params: { day } })} />
          </View>
          <View style={styles.grow}>
            <Button
              label="חסימת זמן"
              variant="secondary"
              onPress={() => router.push({ pathname: '/block-time', params: { day } })}
            />
          </View>
        </View>

        {agendaState.status === 'loading' ? (
          <Text muted>טוענים…</Text>
        ) : agendaState.status === 'error' ? (
          <>
            <Text muted>לא הצלחנו לטעון את היום הזה.</Text>
            <Button label="לנסות שוב" variant="secondary" onPress={reloadAgenda} />
          </>
        ) : (
          <DayItems
            day={day}
            appointments={selectedDay.appointments}
            blocks={selectedDay.blocks}
            onChanged={reload}
          />
        )}
      </View>

      <BookingRules proId={proId} initial={settings} />
    </Screen>
  );
}

function DayItems({
  day,
  appointments,
  blocks,
  onChanged,
}: {
  day: string;
  appointments: ProAppointment[];
  blocks: TimeOff[];
  onChanged: () => void;
}) {
  const items = [
    ...appointments.map((a) => ({ at: a.starts_at, node: <AppointmentItem key={a.id} appointment={a} onChanged={onChanged} /> })),
    ...blocks.map((b) => ({ at: b.starts_at, node: <BlockItem key={b.id} block={b} day={day} onChanged={onChanged} /> })),
  ].sort((x, y) => x.at.localeCompare(y.at));

  if (items.length === 0) {
    return (
      <View style={styles.card}>
        <Text muted>אין תורים ביום הזה.</Text>
      </View>
    );
  }
  return <>{items.map((item) => item.node)}</>;
}

function AppointmentItem({
  appointment: a,
  showDay,
  onChanged,
}: {
  appointment: ProAppointment;
  showDay?: boolean;
  onChanged: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = inIsrael(a.starts_at);
  const end = inIsrael(a.ends_at);
  const now = new Date().toISOString();
  const started = a.starts_at <= now;
  const live = a.status === 'pending' || a.status === 'confirmed';

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const setStatus = (status: AppointmentStatus) => run(() => setAppointmentStatus(a.id, status));

  return (
    <View style={[styles.card, !live && a.status !== 'completed' && styles.faded]}>
      <View style={styles.row}>
        <Text variant="smallBold" style={styles.grow}>
          {showDay ? `${dayLabel(start.day)} · ` : ''}
          {ltr(`${start.time}–${end.time}`)}
        </Text>
        <StatusBadge status={a.status} />
      </View>
      <Text variant="smallBold">{a.client?.name ?? 'לקוחה'}</Text>
      {a.client?.phone ? (
        <Pressable onPress={() => Linking.openURL(`tel:${a.client!.phone}`)} accessibilityRole="link">
          <Text variant="small" style={styles.link}>
            {ltr(a.client.phone)}
          </Text>
        </Pressable>
      ) : null}
      <Text variant="small">
        {a.service_name} · {formatPrice(a.price_ils)}
        {a.location === 'client_home' ? ' · אצל הלקוחה' : ''}
        {a.source === 'manual' ? ' · נוסף ידנית' : ''}
      </Text>
      {a.client_note ? (
        <Text variant="small" muted>
          {a.client_note}
        </Text>
      ) : null}

      {a.status === 'pending' && !started && (
        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button label="אישור" onPress={() => setStatus('confirmed')} busy={busy} />
          </View>
          <View style={styles.grow}>
            <Button label="דחייה" variant="secondary" onPress={() => setStatus('rejected')} disabled={busy} />
          </View>
        </View>
      )}

      {a.status === 'confirmed' && !started &&
        (confirmingCancel ? (
          <View style={styles.buttons}>
            <View style={styles.grow}>
              <Button label="כן, לבטל את התור" onPress={() => run(() => cancelAppointment(a.id))} busy={busy} />
            </View>
            <View style={styles.grow}>
              <Button label="לא" variant="secondary" onPress={() => setConfirmingCancel(false)} />
            </View>
          </View>
        ) : (
          <Button label="ביטול התור" variant="secondary" onPress={() => setConfirmingCancel(true)} />
        ))}

      {started && (a.status === 'confirmed' || a.status === 'completed' || a.status === 'no_show') && (
        <View style={styles.chips}>
          <Chip label="הגיעה" selected={a.status === 'completed'} onPress={() => setStatus('completed')} />
          <Chip label="לא הגיעה" selected={a.status === 'no_show'} onPress={() => setStatus('no_show')} />
        </View>
      )}

      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function BlockItem({ block, day, onChanged }: { block: TimeOff; day: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const start = inIsrael(block.starts_at);
  const end = inIsrael(block.ends_at);
  const from = start.day === day ? start.time : '00:00';
  const to = end.day === day ? end.time : '24:00';
  const wholeDay = from === '00:00' && (to === '24:00' || to === '23:59');

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      await deleteTimeOff(block.id);
      onChanged();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, styles.block]}>
      <View style={styles.row}>
        <Text variant="smallBold" style={styles.grow}>
          {wholeDay ? 'כל היום' : ltr(`${from}–${to}`)} · {TIME_OFF_TEXT[block.kind]}
        </Text>
        <Pressable onPress={remove} disabled={busy} accessibilityRole="button" accessibilityLabel="הסרת החסימה">
          <Text variant="smallBold" style={styles.link}>
            {busy ? 'מסירים…' : 'הסרה'}
          </Text>
        </Pressable>
      </View>
      {block.note ? (
        <Text variant="small" muted>
          {block.note}
        </Text>
      ) : null}
      {failed ? (
        <Text variant="small" style={styles.error}>
          לא הצלחנו להסיר. כדאי לנסות שוב.
        </Text>
      ) : null}
    </View>
  );
}

const CANCEL_OPTIONS = [0, 6, 12, 24, 48];
const STEP_OPTIONS = [15, 30, 60];

// How clients book her: at once or by request, how late they may cancel, and how often
// a free time starts.
function BookingRules({ proId, initial }: { proId: string; initial: BookingSettings }) {
  const [settings, setSettings] = useState(initial);
  const [failed, setFailed] = useState(false);

  async function change(next: Partial<BookingSettings>) {
    const before = settings;
    setSettings({ ...settings, ...next });
    setFailed(false);
    try {
      await saveBookingSettings(proId, next);
    } catch {
      setSettings(before);
      setFailed(true);
    }
  }

  return (
    <View style={styles.section}>
      <Text variant="heading">הגדרות קביעת תור</Text>
      <View style={styles.card}>
        <Text variant="smallBold">איך לקוחות קובעות תור?</Text>
        <View style={styles.chips}>
          <Chip
            label="התור נקבע מיד"
            selected={settings.booking_mode === 'instant'}
            onPress={() => change({ booking_mode: 'instant' })}
          />
          <Chip
            label="אני מאשרת כל תור"
            selected={settings.booking_mode === 'request'}
            onPress={() => change({ booking_mode: 'request' })}
          />
        </View>

        <Text variant="smallBold">עד כמה זמן לפני התור אפשר לבטל?</Text>
        <View style={styles.chips}>
          {CANCEL_OPTIONS.map((hours) => (
            <Chip
              key={hours}
              label={hours === 0 ? 'עד תחילת התור' : `${hours} שעות`}
              selected={settings.cancellation_hours === hours}
              onPress={() => change({ cancellation_hours: hours })}
            />
          ))}
        </View>
        <Text variant="caption" muted>
          הלקוחות רואות כשהן קובעות תור: {cancellationPolicy(settings.cancellation_hours)}
        </Text>

        <Text variant="smallBold">כל כמה זמן מתחיל תור פנוי?</Text>
        <View style={styles.chips}>
          {STEP_OPTIONS.map((minutes) => (
            <Chip
              key={minutes}
              label={minutes === 60 ? 'כל שעה' : `כל ${minutes} דק'`}
              selected={settings.slot_step_min === minutes}
              onPress={() => change({ slot_step_min: minutes })}
            />
          ))}
        </View>
        {failed ? (
          <Text variant="small" style={styles.error}>
            לא הצלחנו לשמור את השינוי. כדאי לבדוק את החיבור לאינטרנט.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notice: {
    backgroundColor: Colors.secondaryTint,
    borderColor: Colors.secondaryTint,
  },
  noticeText: {
    color: Colors.secondaryOnTint,
  },
  faded: {
    backgroundColor: Colors.background,
  },
  block: {
    backgroundColor: Colors.placeholder,
    borderColor: Colors.placeholder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  link: {
    color: Colors.accent,
  },
  error: {
    color: Colors.accentPressed,
  },
});
