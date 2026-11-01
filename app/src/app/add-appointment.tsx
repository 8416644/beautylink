import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { DayPicker } from '@/components/day-picker';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { addManualAppointment, errorText } from '@/lib/appointments';
import { useAuth } from '@/lib/auth';
import { dayLabel, daysFrom, today } from '@/lib/dates';
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
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripStart] = useState(() => (initialDay < today() ? initialDay : today()));

  const parsed = parseTime(time);
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
        <DayPicker days={daysFrom(stripStart, 60)} selected={day} onSelect={setDay} />
        <Text variant="smallBold">{dayLabel(day)}</Text>
        <TextField
          label="שעה"
          ltr
          value={time}
          onChangeText={setTime}
          onBlur={() => parsed && setTime(parsed)}
          keyboardType="numbers-and-punctuation"
          placeholder="10:30"
        />
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
