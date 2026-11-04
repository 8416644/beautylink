import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { MAX_REVIEW_LENGTH, reviewErrorText, submitReview } from '@/lib/reviews';

const RATING_WORDS = ['', 'לא מרוצה', 'סביר', 'טוב', 'טוב מאוד', 'מעולה'];

// A client rates and reviews an appointment that took place. Opened from "התורים שלי".
export default function ReviewScreen() {
  const { id, pro, proName, service } = useLocalSearchParams<{
    id: string;
    pro: string;
    proName?: string;
    service?: string;
  }>();
  const { session } = useAuth();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!session) {
    return (
      <Screen inTabs={false}>
        <Text variant="title">כתיבת ביקורת</Text>
        <View style={styles.card}>
          <Text>כדי לכתוב ביקורת צריך להתחבר.</Text>
        </View>
        <Button label="התחברות" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen inTabs={false}>
        <Text variant="title">תודה!</Text>
        <View style={styles.card}>
          <Text>הביקורת שלך נשמרה ותופיע בדף של {proName ?? 'בעלת המקצוע'}.</Text>
        </View>
        <Button label="חזרה לתורים שלי" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await submitReview({ userId: session!.user.id, appointmentId: id, proId: pro, rating, body });
      setDone(true);
    } catch (e) {
      setError(reviewErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen inTabs={false}>
      <Text variant="title">כתיבת ביקורת</Text>
      <Text muted>{[service, proName].filter(Boolean).join(' · ')}</Text>

      <View style={styles.section}>
        <Text variant="heading">איך היה?</Text>
        <View style={styles.stars} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              hitSlop={6}
              accessibilityRole="radio"
              accessibilityState={{ checked: rating === n }}
              accessibilityLabel={`${n} מתוך 5, ${RATING_WORDS[n]}`}>
              <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text variant="smallBold" style={styles.ratingWord}>
          {rating > 0 ? RATING_WORDS[rating] : 'בוחרים מ-1 עד 5 כוכבים'}
        </Text>
      </View>

      <TextField
        label="מה כדאי שלקוחות אחרות ידעו? (לא חובה)"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={MAX_REVIEW_LENGTH}
        hint="למשל: על השירות, המקום, היחס והתוצאה. הביקורת תופיע עם השם הפרטי שלך."
      />

      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="פרסום הביקורת" onPress={submit} disabled={rating === 0} busy={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  section: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  star: {
    fontSize: 40,
    lineHeight: 48,
    color: Colors.border,
  },
  starOn: {
    color: Colors.star,
  },
  ratingWord: {
    textAlign: 'center',
  },
  error: {
    color: Colors.accentPressed,
  },
});
