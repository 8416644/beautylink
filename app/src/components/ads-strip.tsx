import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export const ADS_STRIP_HEIGHT = 76;
const ROTATE_MS = 3500;

type Ad = {
  title: string;
  subtitle: string;
  image: number;
  action: string;
  href: Href;
};

// BeautyLink's own messages, until pros and the admin can place ads. Pictures follow the
// app's modesty rule: objects and hands, no bodies.
const HOUSE_ADS: Ad[] = [
  {
    title: 'בעלת מקצוע? הצטרפי אלינו',
    subtitle: 'מצטרפים בחינם ומקבלים לקוחות חדשות',
    image: require('@/assets/images/categories/nails.jpg'),
    action: 'להצטרפות',
    href: '/pro-signup',
  },
  {
    title: 'קובעים תור בכמה לחיצות',
    subtitle: 'בוחרים טיפול ושעה פנויה, בלי טלפונים',
    image: require('@/assets/images/categories/makeup.jpg'),
    action: 'לחיפוש',
    href: '/search',
  },
  {
    title: 'פאות בעיצוב אישי',
    subtitle: 'מעצבות פאות מומלצות, קרוב אלייך',
    image: require('@/assets/images/categories/wigs.jpg'),
    action: 'לפרטים',
    href: { pathname: '/search', params: { category: 'wigs' } },
  },
];

// A strip of ads that changes every few seconds; a tap opens the ad's page.
export function AdsStrip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % HOUSE_ADS.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const ad = HOUSE_ADS[index];
  return (
    <Pressable
      style={styles.strip}
      onPress={() => router.push(ad.href)}
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
      <View style={styles.action}>
        <Text variant="caption" style={styles.actionText}>
          {ad.action}
        </Text>
      </View>
      <View style={styles.tag}>
        <Text variant="caption" style={styles.tagText}>
          מודעה
        </Text>
      </View>
      <View style={styles.dots}>
        {HOUSE_ADS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
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
