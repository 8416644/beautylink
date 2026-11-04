import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdsStrip, ADS_STRIP_HEIGHT } from '@/components/ads-strip';
import { CategoryImage } from '@/components/category-image';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/lib/categories';

const PLACEHOLDER_TILES = 8;
const IMAGE_SIZE = 52;

export default function HomeScreen() {
  const { state, reload } = useCategories();

  return (
    <Screen footer={<AdsStrip />} footerHeight={ADS_STRIP_HEIGHT}>
      {/* Compact, so all the categories fit above the ads strip on a phone. */}
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="BeautyLink"
          />
        </View>
        <Text variant="heading" style={styles.greeting}>
          מה מתחשק לך היום?
        </Text>

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

        <Text variant="smallBold" style={styles.sectionTitle}>
          קטגוריות
        </Text>
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
                      <Text variant="caption" style={styles.categoryName}>
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
  content: {
    gap: Spacing.three,
  },
  // A circle in the logo's own background pink, so the rectangular file blends into it.
  logoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE6FE',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // The logo file is trimmed to its drawing (206 by 179). This is the largest size whose
  // corners still fit inside the circle.
  logo: {
    width: 78,
    height: 68,
  },
  greeting: {
    textAlign: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    height: 46,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchText: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  // Four cards a row; a last row that is not full sits in the middle.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  category: {
    width: '23%',
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
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
    fontFamily: Fonts.medium,
  },
  placeholder: {
    backgroundColor: Colors.placeholder,
  },
  placeholderName: {
    width: 40,
    height: 10,
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
