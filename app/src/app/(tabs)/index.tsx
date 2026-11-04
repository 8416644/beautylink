import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryImage } from '@/components/category-image';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/lib/categories';

const PLACEHOLDER_TILES = 6;
const IMAGE_SIZE = 96;

export default function HomeScreen() {
  const { state, reload } = useCategories();

  return (
    <Screen>
      <Text variant="title">מה מתחשק לך היום?</Text>

      <Link href="/search" asChild>
        <Pressable style={styles.search} accessibilityRole="search" accessibilityLabel="חיפוש">
          <Icon
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            color={Colors.textSecondary}
            size={20}
          />
          <Text muted style={styles.searchText}>
            חיפוש בעלת מקצוע או שירות
          </Text>
        </Pressable>
      </Link>

      <View style={styles.section}>
        <Text variant="heading">קטגוריות</Text>
        {state.status === 'error' ? (
          <View style={styles.error}>
            <Text muted>לא הצלחנו לטעון את הקטגוריות. כדאי לבדוק את החיבור לאינטרנט.</Text>
            <Pressable style={styles.retry} onPress={reload} accessibilityRole="button">
              <Text variant="smallBold" style={styles.retryText}>
                לנסות שוב
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {state.status === 'loading'
              ? Array.from({ length: PLACEHOLDER_TILES }, (_, i) => (
                  <View key={i} style={styles.category}>
                    <View style={[styles.placeholderImage, styles.placeholder]} />
                    <View style={styles.placeholderName} />
                  </View>
                ))
              : state.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={{ pathname: '/search', params: { category: category.slug } }}
                    asChild>
                    {/* A plain style: Link's asChild drops a style function on the web. */}
                    <Pressable style={styles.category} accessibilityRole="link">
                      <CategoryImage icon={category.icon ?? category.slug} size={IMAGE_SIZE} />
                      <Text variant="heading" style={styles.categoryName}>
                        {category.name}
                      </Text>
                    </Pressable>
                  </Link>
                ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    height: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchText: {
    flex: 1,
  },
  section: {
    gap: Spacing.three,
  },
  // Two cards a row, as in the original BeautyLink design.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },
  category: {
    width: '48%',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  placeholderImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
  },
  categoryName: {
    textAlign: 'center',
  },
  placeholder: {
    backgroundColor: Colors.placeholder,
  },
  placeholderName: {
    width: 48,
    height: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.placeholder,
  },
  error: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  retryText: {
    color: Colors.surface,
  },
});
