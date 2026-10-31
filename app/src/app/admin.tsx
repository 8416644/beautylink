import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { fetchProsByStatus, setProStatus, type ProForReview } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import type { ProStatus } from '@/lib/pro-account';
import { useAsync } from '@/lib/use-async';

const FILTERS: { status: ProStatus; label: string }[] = [
  { status: 'pending', label: 'ממתינות לאישור' },
  { status: 'approved', label: 'מאושרות' },
  { status: 'rejected', label: 'נדחו' },
  { status: 'suspended', label: 'מושהות' },
];

export default function AdminScreen() {
  const { loading, session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [filter, setFilter] = useState<ProStatus>('pending');
  const { state, reload } = useAsync(isAdmin ? filter : null, () => fetchProsByStatus(filter));

  // The profile row (with the role) loads right after the session.
  if (loading || (session !== null && profile === null)) {
    return (
      <Screen>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <Text variant="title">ניהול</Text>
        <View style={styles.card}>
          <Text>המסך הזה מיועד למנהלי BeautyLink בלבד.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">אישור בעלות מקצוע</Text>
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip
            key={f.status}
            label={f.label}
            selected={filter === f.status}
            onPress={() => setFilter(f.status)}
          />
        ))}
      </View>

      {state.status === 'loading' ? (
        <Text muted>טוענים…</Text>
      ) : state.status === 'error' ? (
        <View style={styles.card}>
          <Text muted>לא הצלחנו לטעון את הרשימה.</Text>
          <Button label="לנסות שוב" variant="secondary" onPress={reload} />
        </View>
      ) : state.data.length === 0 ? (
        <View style={styles.card}>
          <Text muted>אין כרגע בעלות מקצוע ברשימה הזו.</Text>
        </View>
      ) : (
        state.data.map((pro) => (
          <ReviewCard key={pro.user_id} pro={pro} adminId={profile.id} onChanged={reload} />
        ))
      )}
    </Screen>
  );
}

type ReviewCardProps = { pro: ProForReview; adminId: string; onChanged: () => void };

function ReviewCard({ pro, adminId, onChanged }: ReviewCardProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(status: 'approved' | 'rejected' | 'suspended') {
    setBusy(true);
    setError(null);
    try {
      await setProStatus(adminId, pro.user_id, status, status === 'rejected' ? reason.trim() : undefined);
      onChanged();
    } catch {
      setError('הפעולה לא הצליחה. כדאי לנסות שוב.');
      setBusy(false);
    }
  }

  const where = [
    pro.works_at_salon && 'בסלון',
    pro.works_at_home && 'בבית',
    pro.travels_to_client && `מגיעה ללקוחה (עד ${pro.travel_radius_km} ק"מ)`,
  ].filter(Boolean);
  const services = pro.pro_subcategories
    .map((s) => s.subcategories?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.card}>
      <Text variant="heading">{pro.display_name}</Text>
      <Text variant="small" muted>
        {[pro.profiles?.full_name, pro.profiles?.phone].filter(Boolean).join(' · ')}
      </Text>
      <Detail label="מיקום" value={[pro.neighborhood, pro.city].filter(Boolean).join(', ')} />
      <Detail label="עובדת" value={where.join(', ')} />
      <Detail label="שירותים" value={services} />
      {pro.years_experience !== null && (
        <Detail label="ניסיון" value={`${pro.years_experience} שנים`} />
      )}
      {pro.instagram_url ? <Detail label="אינסטגרם" value={pro.instagram_url} /> : null}
      {pro.tiktok_url ? <Detail label="טיקטוק" value={pro.tiktok_url} /> : null}
      {pro.facebook_url ? <Detail label="פייסבוק" value={pro.facebook_url} /> : null}
      {pro.bio ? <Text variant="small">{pro.bio}</Text> : null}
      {pro.rejection_reason ? <Detail label="סיבת דחייה" value={pro.rejection_reason} /> : null}
      <Text variant="caption" muted>
        נרשמה ב-{new Date(pro.created_at).toLocaleDateString('he-IL')}
      </Text>

      {rejecting ? (
        <View style={styles.actions}>
          <TextField
            label="סיבת הדחייה (בעלת המקצוע תראה אותה)"
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button label="דחייה" onPress={() => change('rejected')} busy={busy} />
          <Button label="ביטול" variant="secondary" onPress={() => setRejecting(false)} />
        </View>
      ) : (
        <View style={styles.actions}>
          {pro.status !== 'approved' && (
            <Button label="אישור" onPress={() => change('approved')} busy={busy} />
          )}
          {(pro.status === 'pending' || pro.status === 'approved') && (
            <Button
              label={pro.status === 'pending' ? 'דחייה' : 'השהיה'}
              variant="secondary"
              onPress={() => (pro.status === 'pending' ? setRejecting(true) : change('suspended'))}
              disabled={busy}
            />
          )}
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

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <Text variant="small">
      <Text variant="smallBold">{label}: </Text>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  error: {
    color: Colors.accentPressed,
  },
});
