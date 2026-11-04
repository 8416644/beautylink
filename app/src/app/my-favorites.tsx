import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FavoriteButton } from '@/components/favorite-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchMyFavorites, useFavoriteIds, type FavoritePro } from '@/lib/favorites';
import { useAsync } from '@/lib/use-async';

// The client's saved pros. A heart tapped off here leaves the list at once.
export default function MyFavoritesScreen() {
  const { loading, session } = useAuth();
  const userId = session?.user.id ?? null;
  const savedIds = useFavoriteIds();
  const { state, reload } = useAsync(userId, () => fetchMyFavorites(userId!));

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
        <Text variant="title">המועדפות שלי</Text>
        <View style={styles.card}>
          <Text>מתחברים כדי לשמור בעלות מקצוע שאהבת.</Text>
        </View>
        <Button label="התחברות או הרשמה" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen inTabs={false}>
      <Text variant="title">המועדפות שלי</Text>
      {state.status === 'loading' ? (
        <Text muted>טוענים…</Text>
      ) : state.status === 'error' ? (
        <>
          <View style={styles.card}>
            <Text muted>לא הצלחנו לטעון את המועדפות. כדאי לבדוק את החיבור לאינטרנט.</Text>
          </View>
          <Button label="לנסות שוב" onPress={reload} />
        </>
      ) : (
        <FavoritesList pros={state.data.filter((p) => savedIds.has(p.user_id))} />
      )}
    </Screen>
  );
}

function FavoritesList({ pros }: { pros: FavoritePro[] }) {
  if (pros.length === 0) {
    return (
      <View style={styles.card}>
        <Text variant="smallBold">עוד לא שמרת בעלות מקצוע</Text>
        <Text muted>בדף של בעלת מקצוע או בתוצאות החיפוש, לוחצים על הלב כדי לשמור אותה כאן.</Text>
        <Button label="לחיפוש" variant="secondary" onPress={() => router.push('/search')} />
      </View>
    );
  }
  return pros.map((pro) => <FavoriteRow key={pro.user_id} pro={pro} />);
}

function FavoriteRow({ pro }: { pro: FavoritePro }) {
  const place = [pro.neighborhood, pro.city].filter(Boolean).join(', ');
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push({ pathname: '/pro/[id]', params: { id: pro.user_id } })}
      accessibilityRole="link"
      accessibilityLabel={`הדף של ${pro.display_name}`}>
      {pro.cover_url ? (
        <Image source={{ uri: pro.cover_url }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={[styles.photo, styles.initial]}>
          <Text variant="heading" style={styles.initialText}>
            {pro.display_name.slice(0, 1)}
          </Text>
        </View>
      )}
      <View style={styles.grow}>
        <Text variant="smallBold">{pro.display_name}</Text>
        <Text variant="small" muted>
          {place}
          {' · '}
          {pro.rating_count > 0 ? `★ ${Number(pro.rating_avg).toFixed(1)}` : 'חדשה'}
        </Text>
      </View>
      <FavoriteButton proId={pro.user_id} proName={pro.display_name} />
    </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowPressed: {
    borderColor: Colors.accent,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: Radius.small,
    backgroundColor: Colors.placeholder,
  },
  initial: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentTint,
  },
  initialText: {
    color: Colors.accentOnTint,
  },
  grow: {
    flex: 1,
    gap: 2,
  },
});
