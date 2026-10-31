import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/lib/categories';

const PLACEHOLDER_TILES = 8;

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
                    <View style={[styles.categoryIcon, styles.placeholder]} />
                    <View style={styles.placeholderName} />
                  </View>
                ))
              : state.categories.map((category, i) => {
                  // Tiles alternate between the two brand tints, as in the designs.
                  const rose = i % 2 === 0;
                  return (
                    <Link
                      key={category.id}
                      href={{ pathname: '/search', params: { category: category.slug } }}
                      asChild>
                      <Pressable style={styles.category} accessibilityRole="link">
                        <View
                          style={[
                            styles.categoryIcon,
                            { backgroundColor: rose ? Colors.accentTint : Colors.secondaryTint },
                          ]}>
                          <CategoryIcon
                            slug={category.icon ?? category.slug}
                            color={rose ? Colors.accentOnTint : Colors.secondaryOnTint}
                          />
                        </View>
                        <Text variant="small" style={styles.categoryName}>
                          {category.name}
                        </Text>
                      </Pressable>
                    </Link>
                  );
                })}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.four,
  },
  category: {
    width: '25%',
    alignItems: 'center',
    gap: Spacing.two,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Colors.accent,
  },
  retryText: {
    color: Colors.surface,
  },
});
