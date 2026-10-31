import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { signOut, useAuth } from '@/lib/auth';
import { fetchOwnProProfile, type ProStatus } from '@/lib/pro-account';
import { useAsync } from '@/lib/use-async';

const STATUS_TEXT: Record<ProStatus, string> = {
  draft: 'טיוטה, עוד לא נשלחה לאישור',
  pending: 'ממתין לאישור צוות BeautyLink',
  approved: 'מאושר ומופיע בחיפוש',
  rejected: 'לא אושר. אפשר לתקן ולשלוח שוב',
  suspended: 'מושהה',
};

export default function ProfileScreen() {
  const { loading, session, profile } = useAuth();
  const userId = session?.user.id ?? null;
  const { state: proState } = useAsync(userId, () => fetchOwnProProfile(userId!));

  if (loading) return <Screen>{null}</Screen>;

  if (!session) {
    return (
      <Screen>
        <Text variant="title">פרופיל</Text>
        <View style={styles.card}>
          <Text>מתחברים כדי לקבוע תורים, לשמור מועדפות ולהצטרף כבעלת מקצוע.</Text>
        </View>
        <Button label="התחברות או הרשמה" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  const pro = proState.status === 'ready' ? proState.data : null;
  const name = profile?.full_name || session.user.email;

  return (
    <Screen>
      <Text variant="title">שלום{name ? `, ${name}` : ''}</Text>
      <Text variant="small" muted>
        {session.user.email}
      </Text>

      <View style={styles.card}>
        <Text variant="heading">בעלת מקצוע?</Text>
        {proState.status === 'loading' ? (
          <Text muted>טוענים…</Text>
        ) : pro ? (
          <>
            <Text>
              <Text variant="smallBold">{pro.display_name}</Text>
              {' · '}
              {STATUS_TEXT[pro.status]}
            </Text>
            <Button
              label="הפרופיל המקצועי שלי"
              variant="secondary"
              onPress={() => router.push('/pro-signup')}
            />
            {pro.status !== 'suspended' && (
              <Button
                label="השירותים והמחירים שלי"
                variant="secondary"
                onPress={() => router.push('/my-services')}
              />
            )}
            {pro.status !== 'suspended' && (
              <Button
                label="תיק העבודות שלי"
                variant="secondary"
                onPress={() => router.push('/my-portfolio')}
              />
            )}
          </>
        ) : (
          <>
            <Text muted>מצטרפים בחינם, ולקוחות חדשות מוצאות אותך בחיפוש.</Text>
            <Button label="הצטרפות כבעלת מקצוע" onPress={() => router.push('/pro-signup')} />
          </>
        )}
      </View>

      {profile?.role === 'admin' && (
        <View style={styles.card}>
          <Text variant="heading">ניהול</Text>
          <Button label="אישור בעלות מקצוע" onPress={() => router.push('/admin')} />
        </View>
      )}

      <Button
        label="שינוי סיסמה"
        variant="secondary"
        onPress={() => router.push('/set-password')}
      />
      <Button label="התנתקות" variant="secondary" onPress={signOut} />
    </Screen>
  );
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
});
