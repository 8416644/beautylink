import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StatusBadge } from '@/components/status-badge';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  cancelAppointment,
  cancellationPolicy,
  errorText,
  fetchMyAppointments,
  type ClientAppointment,
} from '@/lib/appointments';
import { useAuth } from '@/lib/auth';
import { dayLabel, inIsrael, ltr } from '@/lib/dates';
import { fetchOwnProProfile } from '@/lib/pro-account';
import { fetchMyReviewedAppointmentIds } from '@/lib/reviews';
import { formatPrice } from '@/lib/services';
import { useAsync } from '@/lib/use-async';
import { useReloadOnFocus } from '@/lib/use-reload-on-focus';

// A client's appointments, upcoming first. A pro also gets the way into her calendar here.
export default function AppointmentsScreen() {
  const { loading, session } = useAuth();
  const userId = session?.user.id ?? null;
  const { state, reload } = useAsync(userId, async () => {
    const [appointments, pro, reviewed] = await Promise.all([
      fetchMyAppointments(),
      fetchOwnProProfile(userId!),
      fetchMyReviewedAppointmentIds(userId!),
    ]);
    return { appointments, isPro: pro !== null && pro.status !== 'suspended', reviewed };
  });
  useReloadOnFocus(reload);

  if (loading) return <Screen>{null}</Screen>;

  if (!session) {
    return (
      <Screen>
        <Text variant="title">התורים שלי</Text>
        <View style={styles.card}>
          <Text>מתחברים כדי לקבוע תורים ולראות אותם כאן.</Text>
        </View>
        <Button label="התחברות או הרשמה" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <Text variant="title">התורים שלי</Text>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Text variant="title">התורים שלי</Text>
        <View style={styles.card}>
          <Text muted>לא הצלחנו לטעון את התורים. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </View>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const { appointments, isPro, reviewed } = state.data;
  const now = new Date().toISOString();
  const live = (a: ClientAppointment) => a.status === 'pending' || a.status === 'confirmed';
  const upcoming = appointments.filter((a) => live(a) && a.ends_at > now).reverse();
  const past = appointments.filter((a) => !(live(a) && a.ends_at > now));

  return (
    <Screen>
      <Text variant="title">התורים שלי</Text>

      {isPro && (
        <View style={[styles.card, styles.proCard]}>
          <Text variant="smallBold">בעלת מקצוע?</Text>
          <Text variant="small" muted>
            התורים של הלקוחות שלך, בקשות שמחכות לאישור, תורים ידניים וחסימת זמן.
          </Text>
          <Button label="היומן שלי" onPress={() => router.push('/my-calendar')} />
        </View>
      )}

      <View style={styles.section}>
        <Text variant="heading">קרובים</Text>
        {upcoming.length === 0 ? (
          <View style={styles.card}>
            <Text muted>אין לך תורים קרובים.</Text>
            <Button label="לחיפוש בעלת מקצוע" variant="secondary" onPress={() => router.push('/search')} />
          </View>
        ) : (
          upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} onChanged={reload} />)
        )}
      </View>

      {past.length > 0 && (
        <View style={styles.section}>
          <Text variant="heading">קודמים</Text>
          {past.map((a) => (
            <AppointmentCard key={a.id} appointment={a} onChanged={reload} reviewed={reviewed.has(a.id)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function AppointmentCard({
  appointment: a,
  onChanged,
  reviewed = false,
}: {
  appointment: ClientAppointment;
  onChanged: () => void;
  reviewed?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = inIsrael(a.starts_at);
  const end = inIsrael(a.ends_at);
  const upcoming = (a.status === 'pending' || a.status === 'confirmed') && a.ends_at > new Date().toISOString();

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await cancelAppointment(a.id);
      onChanged();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, !upcoming && styles.pastCard]}>
      <View style={styles.row}>
        <Text variant="smallBold" style={styles.grow}>
          {a.service_name}
        </Text>
        <StatusBadge status={a.status} />
      </View>
      <Pressable onPress={() => router.push(`/pro/${a.pro_id}`)} accessibilityRole="link">
        <Text variant="small" style={styles.link}>
          {a.pro_name}
        </Text>
      </Pressable>
      <Text>
        {dayLabel(start.day)} · {ltr(`${start.time}–${end.time}`)}
      </Text>
      <Text variant="small" muted>
        {a.location === 'client_home'
          ? 'בבית שלך'
          : a.address
            ? `${a.address}, ${a.city}`
            : `${a.city} (הכתובת המלאה תופיע כשהתור יאושר)`}
        {' · '}
        {formatPrice(Number(a.price_ils))}
      </Text>

      {upcoming && a.status === 'confirmed' && (
        <Text variant="caption" muted>
          {a.can_cancel
            ? cancellationPolicy(a.cancellation_hours)
            : 'עבר מועד הביטול, ולכן התור כרוך בתשלום גם אם לא תגיעי. לשינוי אפשר לפנות לבעלת המקצוע.'}
        </Text>
      )}

      {a.can_cancel &&
        (confirming ? (
          <View style={styles.confirm}>
            <Text variant="small">{a.status === 'pending' ? 'לבטל את הבקשה?' : 'לבטל את התור?'}</Text>
            <View style={styles.buttons}>
              <View style={styles.grow}>
                <Button label="כן, לבטל" onPress={cancel} busy={busy} />
              </View>
              <View style={styles.grow}>
                <Button label="לא" variant="secondary" onPress={() => setConfirming(false)} />
              </View>
            </View>
          </View>
        ) : (
          <Button label="ביטול" variant="secondary" onPress={() => setConfirming(true)} />
        ))}

      {/* A completed appointment can be reviewed once. */}
      {a.status === 'completed' &&
        (reviewed ? (
          <Text variant="caption" muted>
            ★ כתבת ביקורת על התור הזה. תודה!
          </Text>
        ) : (
          <Button
            label="כתיבת ביקורת"
            onPress={() =>
              router.push({
                pathname: '/review/[id]',
                params: { id: a.id, pro: a.pro_id, proName: a.pro_name, service: a.service_name },
              })
            }
          />
        ))}

      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
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
  proCard: {
    backgroundColor: Colors.secondaryTint,
    borderColor: Colors.secondaryTint,
  },
  pastCard: {
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  link: {
    color: Colors.accent,
  },
  confirm: {
    gap: Spacing.two,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  error: {
    color: Colors.accentPressed,
  },
});
