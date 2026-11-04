import { Image, type ImageSource } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { fetchShowingAds, type Ad } from '@/lib/ads';
import { useAsync } from '@/lib/use-async';

export const ADS_STRIP_HEIGHT = 76;
const ROTATE_MS = 3500;

type StripItem = {
  key: string;
  title: string;
  subtitle: string;
  image: number | ImageSource;
  action: string;
  href: Href | null;
};

// BeautyLink's own messages, shown while the admin has no ads running. Pictures follow the
// app's modesty rule: objects and hands, no bodies.
const HOUSE_ADS: StripItem[] = [
  {
    key: 'house-join',
    title: 'בעלת מקצוע? הצטרפי אלינו',
    subtitle: 'מצטרפים בחינם ומקבלים לקוחות חדשות',
    image: require('@/assets/images/categories/nails.jpg'),
    action: 'להצטרפות',
    href: '/pro-signup',
  },
  {
    key: 'house-book',
    title: 'קובעים תור בכמה לחיצות',
    subtitle: 'בוחרים טיפול ושעה פנויה, בלי טלפונים',
    image: require('@/assets/images/categories/makeup.jpg'),
    action: 'לחיפוש',
    href: '/search',
  },
  {
    key: 'house-wigs',
    title: 'פאות בעיצוב אישי',
    subtitle: 'מעצבות פאות מומלצות, קרוב אלייך',
    image: require('@/assets/images/categories/wigs.jpg'),
    action: 'לפרטים',
    href: { pathname: '/search', params: { category: 'wigs' } },
  },
];

const LOGO = require('@/assets/images/logo.png');

function toStripItem(ad: Ad): StripItem {
  return {
    key: ad.id,
    title: ad.title,
    subtitle: ad.subtitle,
    image: ad.image_url ? { uri: ad.image_url } : LOGO,
    action: ad.action_label,
    href: ad.pro_id
      ? { pathname: '/pro/[id]', params: { id: ad.pro_id } }
      : ad.category_slug
        ? { pathname: '/search', params: { category: ad.category_slug } }
        : null,
  };
}

// A strip of ads that changes every few seconds; a tap opens the ad's page. The admin's
// ads when any are running, BeautyLink's own otherwise.
export function AdsStrip() {
  const { state } = useAsync('ads', fetchShowingAds);
  const running = state.status === 'ready' ? state.data.map(toStripItem) : [];
  const items = running.length > 0 ? running : HOUSE_ADS;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const index = tick % items.length;
  const ad = items[index];
  return (
    <Pressable
      style={styles.strip}
      onPress={() => ad.href && router.push(ad.href)}
      disabled={ad.href === null}
      accessibilityRole="link"
      accessibilityLabel={`מודעה: ${ad.title}. ${ad.subtitle}`}>
      <Image source={ad.image} style={styles.image} contentFit="cover" transition={300} />
      <View style={styles.text}>
        <Text variant="smallBold" numberOfLines={1}>
          {ad.title}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {ad.subtitle}
        </Text>
      </View>
      {ad.href && (
        <View style={styles.action}>
          <Text variant="caption" style={styles.actionText}>
            {ad.action}
          </Text>
        </View>
      )}
      <View style={styles.tag}>
        <Text variant="caption" style={styles.tagText}>
          מודעה
        </Text>
      </View>
      <View style={styles.dots}>
        {items.map((item, i) => (
          <View key={item.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: ADS_STRIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: Radius.small,
  },
  text: {
    flex: 1,
  },
  action: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  actionText: {
    color: Colors.onInk,
  },
  tag: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.three,
    paddingHorizontal: Spacing.one + 2,
    borderRadius: Radius.small,
    backgroundColor: Colors.accentTint,
  },
  tagText: {
    fontSize: 10,
    lineHeight: 14,
    color: Colors.accentOnTint,
  },
  dots: {
    position: 'absolute',
    bottom: Spacing.one,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.accent,
  },
});
