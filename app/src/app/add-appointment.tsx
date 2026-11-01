import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { MonthCalendar } from '@/components/month-calendar';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { addManualAppointment, errorText, fetchMyFreeTimes } from '@/lib/appointments';
import { useAuth } from '@/lib/auth';
import { dayLabel, ltr, monthOf, today } from '@/lib/dates';
import { parseTime } from '@/lib/hours';
import { fetchOwnServices, formatDuration, formatPrice, type Service } from '@/lib/services';
import { useAsync } from '@/lib/use-async';

// The pro adds a booking herself, for a client who called or came by.
export default function AddAppointmentScreen() {
  const { day } = useLocalSearchParams<{ day?: string }>();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { state, reload } = useAsync(userId, () => fetchOwnServices(userId!));

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
          <Text muted>לא הצלחנו לטעון את השירותים שלך. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </View>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }
  if (state.data.length === 0) {
    return (
      <Screen>
        <Text variant="title">הוספת תור</Text>
        <View style={styles.card}>
          <Text>קודם מוסיפים שירותים ומחירים, ואז אפשר לקבוע עליהם תורים.</Text>
        </View>
        <Button label="השירותים שלי" onPress={() => router.replace('/my-services')} />
      </Screen>
    );
  }
  return <Form services={state.data} initialDay={day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : today()} />;
}

function Form({ services, initialDay }: { services: Service[]; initialDay: string }) {
  const [serviceId, setServiceId] = useState(services.find((s) => s.is_active)?.id ?? services[0].id);
  const [day, setDay] = useState(initialDay);
  // A free time she picked from the list, or a time she typed herself.
  const [picked, setPicked] = useState<string | null>(null);
  const [otherTime, setOtherTime] = useState(false);
  const [typed, setTyped] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => monthOf(initialDay));

  const { state: timesState, reload: reloadTimes } = useAsync(`${serviceId}:${day}`, () =>
    fetchMyFreeTimes(serviceId, day),
  );
  const freeTimes = timesState.status === 'ready' ? timesState.data : [];
  // A picked time counts only while it is still in the list for this service and day.
  const pickedTime = picked && freeTimes.includes(picked) ? picked : null;
  const parsed = otherTime ? parseTime(typed) : pickedTime;
  const ready = parsed !== null && name.trim() !== '';

  async function save() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      await addManualAppointment({ serviceId, day, time: parsed, clientName: name, phone, note });
      router.back();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
      reloadTimes();
    }
  }

  return (
    <Screen>
      <Text variant="title">הוספת תור</Text>
      <Text muted>לתור של לקוחה שהתקשרה או הגיעה. השעה נחסמת ביומן, ולקוחות אחרות לא יוכלו לקבוע עליה.</Text>

      <View style={styles.section}>
        <Text variant="heading">טיפול</Text>
        {services.map((service) => {
          const active = service.id === serviceId;
          return (
            <Pressable
              key={service.id}
              onPress={() => setServiceId(service.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.option, active && styles.optionActive]}>
              <View style={styles.grow}>
                <Text variant="smallBold">{service.name}</Text>
                <Text variant="caption" muted>
                  {formatDuration(service.duration_min)}
                </Text>
              </View>
              <Text variant="smallBold">{formatPrice(service.price_ils)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text variant="heading">מתי</Text>
        <MonthCalendar
          month={month}
          onMonthChange={(m) => {
            setMonth(m);
            setDay(monthOf(today()) === m ? today() : `${m}-01`);
          }}
          selected={day}
          onSelect={setDay}
        />
        <Text variant="smallBold">{dayLabel(day)}</Text>
        <View style={styles.card}>
          <Text variant="smallBold">שעות פנויות</Text>
          {timesState.status === 'loading' ? (
            <Text variant="small" muted>
              טוענים…
            </Text>
          ) : timesState.status === 'error' ? (
            <>
              <Text variant="small" muted>
                לא הצלחנו לטעון את השעות הפנויות.
              </Text>
              <Button label="לנסות שוב" variant="secondary" onPress={reloadTimes} />
            </>
          ) : freeTimes.length === 0 ? (
            <Text variant="small" muted>
              אין שעות פנויות לטיפול הזה ביום הזה לפי שעות העבודה שלך. אפשר לבחור &quot;שעה אחרת&quot;.
            </Text>
          ) : null}
          <View style={styles.chips}>
            {freeTimes.map((t) => (
              <Chip
                key={t}
                label={ltr(t)}
                selected={!otherTime && pickedTime === t}
                onPress={() => {
                  setPicked(t);
                  setOtherTime(false);
                }}
              />
            ))}
            <Chip label="שעה אחרת" selected={otherTime} onPress={() => setOtherTime(true)} />
          </View>
          {otherTime && (
            <TextField
              label="שעה"
              hint="גם מחוץ לשעות העבודה, כל עוד אין תור אחר באותו זמן."
              ltr
              value={typed}
              onChangeText={setTyped}
              onBlur={() => {
                const t = parseTime(typed);
                if (t) setTyped(t);
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="10:30"
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="heading">הלקוחה</Text>
        <TextField label="שם" value={name} onChangeText={setName} autoComplete="name" />
        <TextField
          label="טלפון (לא חובה)"
          ltr
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="050-0000000"
        />
        <TextField label="הערה (לא חובה)" value={note} onChangeText={setNote} multiline />
      </View>

      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="שמירת התור" onPress={save} disabled={!ready} busy={busy} />
    </Screen>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentTint,
  },
  grow: {
    flex: 1,
    gap: 2,
  },
  error: {
    color: Colors.accentPressed,
  },
});
