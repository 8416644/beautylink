import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AdsStrip, ADS_STRIP_HEIGHT } from '@/components/ads-strip';
import { CategoryImage } from '@/components/category-image';
import { FeaturedProBar } from '@/components/featured-pro-bar';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCategories } from '@/lib/categories';

const PLACEHOLDER_TILES = 8;
const IMAGE_SIZE = 52;

// "בוקר טוב" and so on, by the hour in Israel.
function timeGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: 'numeric', hourCycle: 'h23' }).format(
      new Date(),
    ),
  );
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 17) return 'צהריים טובים';
  if (hour >= 17 && hour < 22) return 'ערב טוב';
  return 'לילה טוב';
}

export default function HomeScreen() {
  const { state, reload } = useCategories();
  // A signed-in user is greeted by her first name; everyone else gets the general line.
  const { profile } = useAuth();
  const firstName = profile?.full_name.trim().split(/\s+/)[0] ?? '';
  // Four cards a row, sized from the grid's measured width: a percentage width can round
  // past the row on some phones and push the fourth card down.
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth = gridWidth > 0 ? Math.floor((gridWidth - 3 * Spacing.two) / 4) : undefined;
  // Flattened: Link's asChild accepts a single style object, not a list.
  const tile = StyleSheet.flatten([styles.category, tileWidth !== undefined && { width: tileWidth }]);

  // Free text: a name, a treatment or a place. Results open in the search tab.
  const [query, setQuery] = useState('');
  function submitSearch() {
    const q = query.trim();
    if (!q) return;
    router.push({ pathname: '/search', params: { q } });
  }

  return (
    <Screen footer={<AdsStrip />} footerHeight={ADS_STRIP_HEIGHT}>
      {/* Compact, so all the categories fit above the ads strip on a phone. */}
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="BeautyLink"
        />
        <View>
          {firstName ? (
            <Text variant="heading" style={styles.greeting}>
              {timeGreeting()}, {firstName}
            </Text>
          ) : null}
          <Text variant={firstName ? 'small' : 'heading'} muted={!!firstName} style={styles.greeting}>
            מה מתחשק לך היום?
          </Text>
        </View>

        <View style={styles.search}>
          <Icon
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            color={Colors.textSecondary}
            size={20}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            placeholder="חיפוש בעלת מקצוע, טיפול או עיר"
            placeholderTextColor={Colors.textSecondary}
            style={styles.searchInput}
            accessibilityLabel="חיפוש"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="מחיקת הכיתוב">
              <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} color={Colors.textSecondary} size={20} />
            </Pressable>
          ) : null}
          {query.trim() ? (
            <Pressable onPress={submitSearch} hitSlop={8} accessibilityRole="button" style={styles.searchGo}>
              <Text variant="smallBold" style={styles.searchGoText}>
                חיפוש
              </Text>
            </Pressable>
          ) : null}
        </View>

        <FeaturedProBar />

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
          <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
            {state.status === 'loading'
              ? Array.from({ length: PLACEHOLDER_TILES }, (_, i) => (
                  <View key={i} style={tile}>
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
                    <Pressable style={tile} accessibilityRole="link">
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
  // The round BeautyLink badge, already circular on a transparent background.
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
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
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'right',
  },
  searchGo: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  searchGoText: {
    color: Colors.onInk,
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
    width: '22%', // until the grid is measured
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
