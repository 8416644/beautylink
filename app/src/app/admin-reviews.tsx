import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchAllReviews, setReviewHidden, type AdminReview } from '@/lib/reviews';
import { useAsync } from '@/lib/use-async';

// The admin reads the latest reviews and hides any that do not suit the app (rude or not
// modest), or shows a hidden one again. A hidden review leaves the pro's page and rating.
export default function AdminReviewsScreen() {
  const { loading, session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [filter, setFilter] = useState<'all' | 'hidden'>('all');
  const { state, reload } = useAsync(isAdmin ? 'admin-reviews' : null, fetchAllReviews);

  if (loading || (session !== null && profile === null)) {
    return (
      <Screen inTabs={false}>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen inTabs={false}>
        <Text variant="title">ביקורות</Text>
        <View style={styles.card}>
          <Text>המסך הזה מיועד למנהלי BeautyLink בלבד.</Text>
        </View>
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
        <View style={styles.card}>
          <Text muted>לא הצלחנו לטעון את הביקורות. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </View>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const reviews = filter === 'hidden' ? state.data.filter((r) => r.is_hidden) : state.data;
  return (
    <Screen inTabs={false}>
      <Text variant="title">ביקורות</Text>
      <Text muted>
        ביקורת לא ראויה, למשל עם קללות או תוכן לא צנוע, אפשר להסתיר. היא לא תופיע בדף של בעלת
        המקצוע ולא תיספר בדירוג שלה.
      </Text>
      <View style={styles.chips}>
        <Chip label="כל הביקורות" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="מוסתרות" selected={filter === 'hidden'} onPress={() => setFilter('hidden')} />
      </View>
      {reviews.length === 0 ? (
        <View style={styles.card}>
          <Text muted>{filter === 'hidden' ? 'אין ביקורות מוסתרות.' : 'עדיין אין ביקורות.'}</Text>
        </View>
      ) : (
        reviews.map((review) => <ReviewCard key={review.id} review={review} onChanged={reload} />)
      )}
    </Screen>
  );
}

function ReviewCard({ review, onChanged }: { review: AdminReview; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await setReviewHidden(review.id, !review.is_hidden);
      onChanged();
    } catch {
      setError('הפעולה לא הצליחה. כדאי לנסות שוב.');
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, review.is_hidden && styles.hidden]}>
      <View style={styles.row}>
        <Text variant="smallBold" style={styles.grow}>
          {review.client_name} על {review.pro_name}
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
      {review.pro_reply ? (
        <Text variant="caption" muted>
          תגובת בעלת המקצוע: {review.pro_reply}
        </Text>
      ) : null}
      {review.is_hidden && (
        <Text variant="caption" style={styles.hiddenText}>
          מוסתרת. לא מופיעה בדף ולא נספרת בדירוג.
        </Text>
      )}
      <Button
        label={review.is_hidden ? 'החזרת הביקורת' : 'הסתרת הביקורת'}
        variant="secondary"
        onPress={toggle}
        busy={busy}
      />
      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
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
  hidden: {
    backgroundColor: Colors.background,
  },
  hiddenText: {
    color: Colors.secondaryOnTint,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
  error: {
    color: Colors.accentPressed,
  },
});
