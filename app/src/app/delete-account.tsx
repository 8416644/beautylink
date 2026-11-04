import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { deleteMyAccount } from '@/lib/account';
import { useAuth } from '@/lib/auth';

const CONFIRM_WORD = 'מחיקה';

// Deleting the account for good, as Apple and Google require apps to offer.
// She types a word first, so it never happens by a stray tap.
export default function DeleteAccountScreen() {
  const { loading, session, profile } = useAuth();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Screen inTabs={false}>
        <Text variant="title">החשבון נמחק</Text>
        <View style={styles.card}>
          <Text>החשבון שלך וכל הפרטים שבו נמחקו. תודה שהיית איתנו.</Text>
        </View>
        <Button label="למסך הבית" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen inTabs={false}>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen inTabs={false}>
        <Text variant="title">מחיקת החשבון</Text>
        <View style={styles.card}>
          <Text>צריך להתחבר כדי למחוק את החשבון.</Text>
        </View>
      </Screen>
    );
  }

  if (profile?.role === 'admin') {
    return (
      <Screen inTabs={false}>
        <Text variant="title">מחיקת החשבון</Text>
        <View style={styles.card}>
          <Text>חשבון מנהלת לא נמחק מתוך האפליקציה, כדי שלא יישאר מסך הניהול בלי מנהלת.</Text>
        </View>
      </Screen>
    );
  }

  const userId = session.user.id;
  const ready = typed.trim() === CONFIRM_WORD;

  async function remove() {
    if (!ready) {
      setError(`כדי למחוק, כתבי "${CONFIRM_WORD}" בשדה.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount(userId);
      setDone(true);
    } catch {
      setError('המחיקה לא הצליחה. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.');
      setBusy(false);
    }
  }

  return (
    <Screen inTabs={false}>
      <Text variant="title">מחיקת החשבון</Text>
      <View style={styles.card}>
        <Text variant="smallBold">מה יימחק:</Text>
        <Text variant="small">• הפרטים שלך, המועדפות והביקורות שכתבת.</Text>
        <Text variant="small">• תורים עתידיים שקבעת יבוטלו, והזמן יתפנה אצל בעלת המקצוע.</Text>
        <Text variant="small">
          • אם את בעלת מקצוע: הדף שלך, התמונות, השירותים, שעות העבודה והיומן, והדף לא יופיע
          יותר בחיפוש.
        </Text>
        <Text variant="smallBold" style={styles.warning}>
          אי אפשר לבטל את המחיקה או לשחזר את החשבון.
        </Text>
      </View>
      <TextField
        label={`כדי לאשר, כתבי "${CONFIRM_WORD}"`}
        value={typed}
        onChangeText={(text) => {
          setTyped(text);
          setError(null);
        }}
        autoCorrect={false}
      />
      {error ? (
        <Text variant="small" style={styles.warning} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="מחיקת החשבון לצמיתות" onPress={remove} busy={busy} />
      <Button label="ביטול" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  warning: {
    color: Colors.accentPressed,
  },
});
