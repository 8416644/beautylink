import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { Colors } from '@/constants/theme';

// Illustrations from the original BeautyLink design, keyed by the category's icon
// (categories.icon in the database).
const IMAGES: Record<string, number> = {
  hair: require('@/assets/images/categories/hair.png'),
  makeup: require('@/assets/images/categories/makeup.png'),
  'brows-lashes': require('@/assets/images/categories/brows-lashes.png'),
  laser: require('@/assets/images/categories/laser.png'),
  massage: require('@/assets/images/categories/massage.png'),
  nails: require('@/assets/images/categories/nails.png'),
  tanning: require('@/assets/images/categories/tanning.png'),
  'permanent-makeup': require('@/assets/images/categories/permanent-makeup.png'),
  facials: require('@/assets/images/categories/facials.png'),
  wigs: require('@/assets/images/categories/wigs.webp'),
  brows: require('@/assets/images/categories/brows.png'),
  lashes: require('@/assets/images/categories/lashes.png'),
};

type CategoryImageProps = {
  icon: string;
  size: number;
};

// Icon keys from the first category list (seed.sql), before the categories update.
const ALIASES: Record<string, string> = {
  facial: 'facials',
  removal: 'laser',
};

// A category's round illustration. A category without one (one the admin adds later)
// shows a sparkle on blush instead.
export function CategoryImage({ icon, size }: CategoryImageProps) {
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const image = IMAGES[ALIASES[icon] ?? icon];
  if (image === undefined) {
    return (
      <View style={[circle, styles.fallback]}>
        <CategoryIcon slug={icon} color={Colors.accent} size={size * 0.45} />
      </View>
    );
  }
  return <Image source={image} style={circle} contentFit="cover" accessibilityIgnoresInvertColors />;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentTint,
  },
});
