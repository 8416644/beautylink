import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { fetchFeaturedPro } from '@/lib/featured';
import { useAsync } from '@/lib/use-async';

const LOGO = require('@/assets/images/logo.png');

// The admin's featured pro, as a slim ink bar that opens her page. Nothing shows while
// no pro is featured, or while it loads.
export function FeaturedProBar() {
  const { state } = useAsync('featured-pro', fetchFeaturedPro);
  if (state.status !== 'ready' || !state.data) return null;
  const pro = state.data;
  const place = pro.neighborhood || pro.city;

  return (
    <Pressable
      style={styles.bar}
      onPress={() => router.push({ pathname: '/pro/[id]', params: { id: pro.user_id } })}
      accessibilityRole="link"
      accessibilityLabel={`מומלצת השבוע: ${pro.display_name}, ${place}`}>
      <Image
        source={pro.photo_url ? { uri: pro.photo_url } : LOGO}
        style={styles.photo}
        contentFit="cover"
      />
      <View style={styles.text}>
        <Text variant="caption" style={styles.tag}>
          ★ מומלצת השבוע
        </Text>
        <Text variant="smallBold" style={styles.name} numberOfLines={1}>
          {pro.display_name}
          <Text variant="caption" style={styles.place}>
            {' · '}
            {place}
          </Text>
        </Text>
      </View>
      <View style={styles.action}>
        <Text variant="caption" style={styles.actionText}>
          לדף שלה
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.inkAccent,
  },
  text: {
    flex: 1,
  },
  tag: {
    color: Colors.inkAccent,
  },
  name: {
    color: Colors.onInk,
  },
  place: {
    color: Colors.onInkMuted,
  },
  action: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.inkAccent,
  },
  actionText: {
    color: Colors.ink,
  },
});
