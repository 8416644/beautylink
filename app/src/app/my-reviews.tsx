import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchReviewsAboutMe, MAX_REVIEW_LENGTH, replyToReview, type Review } from '@/lib/reviews';
import { useAsync } from '@/lib/use-async';

type MyReview = Review & { is_hidden: boolean };

// A pro reads the reviews written about her and answers them. Her replies show under the
// reviews on her page.
export default function MyReviewsScreen() {
  const { loading, session } = useAuth();
  const userId = session?.user.id ?? null;
  const { state, reload } = useAsync(userId, () => fetchReviewsAboutMe(userId!));

  if (loading) return <Screen inTabs={false}>{null}</Screen>;

  if (!userId) {
    return (
      <Screen inTabs={false}>
        <Text variant="title">הביקורות שלי</Text>
        <Card>
          <Text>כדי לראות ביקורות צריך להתחבר.</Text>
        </Card>
        <Button label="התחברות" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen inTabs={false}>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen inTabs={false}>
        <Card>
          <Text muted>לא הצלחנו לטעון את הביקורות. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </Card>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const reviews = state.data;
  return (
    <Screen inTabs={false}>
      <Text variant="title">הביקורות שלי</Text>
      <Text muted>מה לקוחות כתבו עלייך. התגובה שלך תופיע מתחת לביקורת בדף שלך.</Text>
      {reviews.length === 0 ? (
        <Card>
          <Text variant="smallBold">עדיין אין ביקורות</Text>
          <Text muted>אחרי שתסמני ביומן שלקוחה הגיעה לתור, היא תוכל לכתוב עלייך ביקורת.</Text>
        </Card>
      ) : (
        reviews.map((review) => <ReviewCard key={review.id} review={review} onChanged={reload} />)
      )}
    </Screen>
  );
}

function ReviewCard({ review, onChanged }: { review: MyReview; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(review.pro_reply ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(text: string) {
    setBusy(true);
    setError(null);
    try {
      await replyToReview(review.id, text);
      setEditing(false);
      onChanged();
    } catch {
      setError('התגובה לא נשמרה. כדאי לנסות שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, review.is_hidden && styles.hidden]}>
      <View style={styles.row}>
        <Text variant="smallBold" style={styles.grow}>
          {review.client_name}
        </Text>
        <Text variant="caption" muted>
          {new Date(review.created_at).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })}
        </Text>
      </View>
      <Text style={styles.stars} accessibilityLabel={`${review.rating} כוכבים מתוך 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Text key={n} style={n <= review.rating ? styles.starOn : styles.starOff}>
            ★
          </Text>
        ))}
      </Text>
      {review.body ? <Text variant="small">{review.body}</Text> : null}
      {review.is_hidden && (
        <Text variant="caption" style={styles.hiddenText}>
          צוות BeautyLink הסתיר את הביקורת הזו, והיא לא מופיעה בדף שלך.
        </Text>
      )}

      {editing ? (
        <View style={styles.actions}>
          <TextField
            label="התגובה שלך"
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={MAX_REVIEW_LENGTH}
            hint="תגובה קצרה ומכבדת. למשל: תודה רבה, שמחה שנהנית!"
          />
          <Button label="שמירת התגובה" onPress={() => save(reply)} disabled={reply.trim() === ''} busy={busy} />
          <Button
            label="ביטול"
            variant="secondary"
            onPress={() => {
              setReply(review.pro_reply ?? '');
              setEditing(false);
            }}
          />
        </View>
      ) : review.pro_reply ? (
        <View style={styles.reply}>
          <Text variant="caption" style={styles.replyTitle}>
            התגובה שלך
          </Text>
          <Text variant="small">{review.pro_reply}</Text>
          <View style={styles.replyActions}>
            <Button label="עריכה" variant="secondary" onPress={() => setEditing(true)} />
            <Button label="מחיקת התגובה" variant="secondary" onPress={() => save('')} busy={busy} />
          </View>
        </View>
      ) : (
        <Button label="תגובה לביקורת" variant="secondary" onPress={() => setEditing(true)} />
      )}
      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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
  hidden: {
    backgroundColor: Colors.background,
  },
  hiddenText: {
    color: Colors.secondaryOnTint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  stars: {
    fontSize: 16,
    lineHeight: 20,
  },
  starOn: {
    color: Colors.star,
  },
  starOff: {
    color: Colors.border,
  },
  reply: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.small,
    backgroundColor: Colors.accentTint,
  },
  replyTitle: {
    color: Colors.accentOnTint,
  },
  replyActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
  },
  error: {
    color: Colors.accentPressed,
  },
});
