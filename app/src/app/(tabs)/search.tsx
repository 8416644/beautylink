import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategories, type Category } from '@/lib/categories';
import { useProsInCategory, type ProSummary } from '@/lib/pros';

export default function SearchScreen() {
  const { category: slug } = useLocalSearchParams<{ category?: string }>();
  const { state: categoriesState, reload } = useCategories();

  const categories = categoriesState.status === 'ready' ? categoriesState.categories : [];
  const selected = categories.find((c) => c.slug === slug);

  return (
    <Screen>
      <Text variant="title">חיפוש</Text>

      {categoriesState.status === 'error' ? (
        <ErrorCard message="לא הצלחנו לטעון את הקטגוריות." onRetry={reload} />
      ) : (
        <View style={styles.chips}>
          {categories.map((category) => {
            const active = category.slug === slug;
            return (
              <Pressable
                key={category.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => router.setParams({ category: category.slug })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <CategoryIcon
                  slug={category.icon ?? category.slug}
                  size={18}
                  color={active ? Colors.surface : Colors.accentOnTint}
                />
                <Text variant="smallBold" style={active && styles.chipTextActive}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {categoriesState.status !== 'ready' ? null : selected ? (
        <CategoryResults category={selected} />
      ) : (
        <View style={styles.card}>
          <Text muted>
            {slug
              ? 'הקטגוריה הזו לא נמצאה. אפשר לבחור קטגוריה אחרת מהרשימה.'
              : 'בחרי קטגוריה כדי לראות את בעלות המקצוע שעובדות בה.'}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function CategoryResults({ category }: { category: Category }) {
  const { state, retry } = useProsInCategory(category.id);

  return (
    <View style={styles.section}>
      <Text variant="heading">{category.name}</Text>
      {state.status === 'loading' ? (
        <Text muted>טוענים בעלות מקצוע…</Text>
      ) : state.status === 'error' ? (
        <ErrorCard message="לא הצלחנו לטעון את בעלות המקצוע." onRetry={retry} />
      ) : state.pros.length === 0 ? (
        <View style={styles.card}>
          <Text variant="smallBold">עדיין אין בעלות מקצוע בקטגוריה הזו</Text>
          <Text muted>בעלות מקצוע חדשות מצטרפות כל הזמן. כדאי לבדוק שוב בקרוב.</Text>
        </View>
      ) : (
        state.pros.map((pro) => <ProCard key={pro.user_id} pro={pro} />)
      )}
    </View>
  );
}

function ProCard({ pro }: { pro: ProSummary }) {
  const place = [pro.neighborhood, pro.city].filter(Boolean).join(', ');
  const where = [
    pro.works_at_salon && 'בסלון',
    pro.works_at_home && 'בבית',
    pro.travels_to_client && 'מגיעה אלייך',
  ].filter(Boolean);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/pro/[id]', params: { id: pro.user_id } })}
      accessibilityRole="link"
      accessibilityLabel={`הדף של ${pro.display_name}`}>
      <View style={styles.proHeader}>
        <Text variant="heading" style={styles.proName}>
          {pro.display_name}
        </Text>
        {pro.rating_count > 0 ? (
          <View style={styles.rating}>
            <Icon name={{ ios: 'star.fill', android: 'star', web: 'star' }} size={16} color={Colors.star} />
            <Text variant="smallBold">{Number(pro.rating_avg).toFixed(1)}</Text>
            <Text variant="small" muted>
              ({pro.rating_count})
            </Text>
          </View>
        ) : (
          <View style={styles.newBadge}>
            <Text variant="caption" style={styles.newBadgeText}>
              חדשה
            </Text>
          </View>
        )}
      </View>
      <Text variant="small" muted>
        {place}
      </Text>
      {where.length > 0 && (
        <View style={styles.tags}>
          {where.map((label) => (
            <View key={label as string} style={styles.tag}>
              <Text variant="caption" style={styles.tagText}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.card}>
      <Text muted>{message} כדאי לבדוק את החיבור לאינטרנט.</Text>
      <Pressable style={styles.retry} onPress={onRetry} accessibilityRole="button">
        <Text variant="smallBold" style={styles.retryText}>
          לנסות שוב
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipTextActive: {
    color: Colors.surface,
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
  cardPressed: {
    borderColor: Colors.accent,
  },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  proName: {
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  newBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondaryTint,
  },
  newBadgeText: {
    color: Colors.secondaryOnTint,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentTint,
  },
  tagText: {
    color: Colors.accentOnTint,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
  },
  retryText: {
    color: Colors.surface,
  },
});
