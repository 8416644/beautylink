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
import { bookAppointment, errorText, fetchFreeSlots, type Slot } from '@/lib/appointments';
import { useAuth } from '@/lib/auth';
import { addDays, dayLabel, daysOfMonth, ltr, monthOf, today } from '@/lib/dates';
import { fetchPublicPro, type PublicPro } from '@/lib/pros';
import { fetchActiveServices, formatDuration, formatPrice, type Service } from '@/lib/services';
import { useAsync } from '@/lib/use-async';

// How far ahead a client can book. The database allows the same.
const DAYS_AHEAD = 182;

// A client books a treatment with a pro: the treatment, the day, the time, and her phone.
export default function BookScreen() {
  const { id, service } = useLocalSearchParams<{ id: string; service?: string }>();
  const { loading, session } = useAuth();
  const { state, reload } = useAsync(id ?? null, async () => {
    const [pro, services] = await Promise.all([fetchPublicPro(id!), fetchActiveServices(id!)]);
    return pro ? { pro, services } : null;
  });

  if (loading) return <Screen>{null}</Screen>;

  if (!session) {
    return (
      <Screen>
        <Text variant="title">קביעת תור</Text>
        <View style={styles.card}>
          <Text>כדי לקבוע תור צריך קודם להתחבר. זה לוקח פחות מדקה.</Text>
        </View>
        <Button label="התחברות או הרשמה" onPress={() => router.push('/sign-in')} />
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
          <Text muted>לא הצלחנו לטעון. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </View>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  if (!state.data || state.data.services.length === 0) {
    return (
      <Screen>
        <View style={styles.card}>
          <Text>אי אפשר לקבוע כרגע תור אצל בעלת המקצוע הזו.</Text>
        </View>
        <Button label="חזרה" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (state.data.pro.user_id === session.user.id) {
    return (
      <Screen>
        <View style={styles.card}>
          <Text>זה הדף שלך. תורים של לקוחות שהתקשרו אלייך מוסיפים מהיומן.</Text>
        </View>
        <Button label="ליומן שלי" onPress={() => router.replace('/my-calendar')} />
      </Screen>
    );
  }

  return <Booking pro={state.data.pro} services={state.data.services} initialServiceId={service} />;
}

type BookingProps = {
  pro: PublicPro;
  services: Service[];
  initialServiceId: string | undefined;
};

function Booking({ pro, services, initialServiceId }: BookingProps) {
  const [serviceId, setServiceId] = useState(
    services.some((s) => s.id === initialServiceId) ? initialServiceId! : services[0].id,
  );
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const atPlace = pro.works_at_salon || pro.works_at_home;
  const [atClientHome, setAtClientHome] = useState(!atPlace);
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const [from] = useState(today);
  const [month, setMonth] = useState(() => monthOf(from));
  const lastMonth = monthOf(addDays(from, DAYS_AHEAD - 1));
  // The days of this month she can still book: none before today.
  const days = daysOfMonth(month).filter((d) => d >= from);

  const { state: slotsState, reload: reloadSlots } = useAsync(`${serviceId}:${month}`, () =>
    fetchFreeSlots(serviceId, days[0], days.length),
  );
  const slots = slotsState.status === 'ready' ? slotsState.data : {};
  const hasSlots = (day: string) => (slots[day]?.length ?? 0) > 0;
  // Until she picks a day, show the first one this month with free times.
  const day = chosenDay && hasSlots(chosenDay) ? chosenDay : (days.find(hasSlots) ?? null);

  const selected = services.find((s) => s.id === serviceId)!;
  const travelFee = Number(pro.travel_fee_ils);
  const price = selected.price_ils + (atClientHome ? travelFee : 0);
  const isRequest = pro.booking_mode === 'request';
  const phoneOk = phone.replace(/\D/g, '').length >= 9;

  function pickService(id: string) {
    setServiceId(id);
    setSlot(null);
    setChosenDay(null);
    setError(null);
  }

  async function book() {
    if (!slot) return;
    setBusy(true);
    setError(null);
    try {
      await bookAppointment({ serviceId, at: slot.at, phone, note, atClientHome });
      setBooked(true);
    } catch (e) {
      setError(errorText(e));
      if (e instanceof Error && e.message === 'slot_taken') {
        setSlot(null);
        reloadSlots();
      }
    } finally {
      setBusy(false);
    }
  }

  if (booked && slot && day) {
    return (
      <Screen>
        <Text variant="title">{isRequest ? 'הבקשה נשלחה' : 'התור נקבע'}</Text>
        <View style={[styles.card, styles.success]}>
          <Text variant="smallBold">
            {selected.name} אצל {pro.display_name}
          </Text>
          <Text>
            {dayLabel(day)} בשעה {ltr(slot.time)}
          </Text>
          <Text variant="small" muted>
            {formatPrice(price)} · {formatDuration(selected.duration_min)}
          </Text>
        </View>
        <Text muted>
          {isRequest
            ? 'בעלת המקצוע תאשר את התור בהקדם. אפשר לראות את מצב הבקשה ב"התורים שלי".'
            : `ביטול אפשרי עד ${pro.cancellation_hours} שעות לפני התור, מ"התורים שלי".`}
        </Text>
        <Button label="לתורים שלי" onPress={() => router.replace('/appointments')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.titleBlock}>
        <Text variant="title">קביעת תור</Text>
        <Text muted>אצל {pro.display_name}</Text>
      </View>

      <Section title="איזה טיפול?">
        {services.map((service) => {
          const active = service.id === serviceId;
          return (
            <Pressable
              key={service.id}
              onPress={() => pickService(service.id)}
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
      </Section>

      {atPlace && pro.travels_to_client && (
        <Section title="איפה?">
          <View style={styles.chips}>
            <Chip
              label={pro.works_at_salon ? 'אצלה בסלון' : 'אצלה בבית'}
              selected={!atClientHome}
              onPress={() => setAtClientHome(false)}
            />
            <Chip
              label={travelFee > 0 ? `היא מגיעה אלייך (+${formatPrice(travelFee)})` : 'היא מגיעה אלייך'}
              selected={atClientHome}
              onPress={() => setAtClientHome(true)}
            />
          </View>
          {atClientHome && (
            <Text variant="small" muted>
              את הכתובת שלך כותבים בהערה למטה.
            </Text>
          )}
        </Section>
      )}

      <Section title="מתי?">
        <MonthCalendar
          month={month}
          onMonthChange={(m) => {
            setMonth(m);
            setChosenDay(null);
            setSlot(null);
          }}
          minMonth={monthOf(from)}
          maxMonth={lastMonth}
          selected={day}
          isAvailable={hasSlots}
          onSelect={(d) => {
            setChosenDay(d);
            setSlot(null);
          }}
        />
        {slotsState.status === 'loading' ? (
          <Text muted>מחפשים שעות פנויות…</Text>
        ) : slotsState.status === 'error' ? (
          <>
            <Text muted>לא הצלחנו לטעון את השעות הפנויות.</Text>
            <Button label="לנסות שוב" variant="secondary" onPress={reloadSlots} />
          </>
        ) : !day ? (
          <View style={styles.card}>
            <Text muted>
              {month < lastMonth
                ? 'אין שעות פנויות לטיפול הזה בחודש הזה. אפשר לעבור לחודש הבא בחץ למעלה, או לבחור טיפול אחר.'
                : 'אין שעות פנויות לטיפול הזה בחודש הזה.'}
            </Text>
          </View>
        ) : (
          <>
            <Text variant="smallBold">{dayLabel(day)}</Text>
            <View style={styles.chips}>
              {slots[day].map((s) => (
                <Chip
                  key={s.at}
                  label={ltr(s.time)}
                  selected={slot?.at === s.at}
                  onPress={() => {
                    setSlot(s);
                    setError(null);
                  }}
                />
              ))}
            </View>
          </>
        )}
      </Section>

      {slot && (
        <>
          <Section title="פרטים">
            <TextField
              label="טלפון"
              hint="רק בעלת המקצוע תראה אותו, כדי ליצור איתך קשר לגבי התור."
              ltr
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="050-0000000"
            />
            <TextField
              label="הערה לבעלת המקצוע (לא חובה)"
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={atClientHome ? 'הכתובת שלך, וכל מה שחשוב לדעת' : 'למשל: זו הפעם הראשונה שלי'}
            />
          </Section>

          <View style={styles.card}>
            <Text variant="smallBold">
              {selected.name} · {dayLabel(day!)} · {ltr(slot.time)}
            </Text>
            <Text variant="small" muted>
              {formatPrice(price)} · {formatDuration(selected.duration_min)}
              {pro.cancellation_hours > 0 ? ` · ביטול עד ${pro.cancellation_hours} שעות לפני` : ''}
            </Text>
          </View>
        </>
      )}

      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {slot && (
        <Button
          label={isRequest ? 'שליחת בקשה לתור' : 'קביעת התור'}
          onPress={book}
          disabled={!phoneOk}
          busy={busy}
        />
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    gap: Spacing.one,
  },
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
  success: {
    backgroundColor: Colors.secondaryTint,
    borderColor: Colors.secondaryTint,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  error: {
    color: Colors.accentPressed,
  },
});
