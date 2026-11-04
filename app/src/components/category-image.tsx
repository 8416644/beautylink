import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { Colors } from '@/constants/theme';

// The BeautyLink category pictures, keyed by the category's icon (categories.icon in the
// database). The app is for religious women, so every picture here must be modest.
const IMAGES: Record<string, number> = {
  nails: require('@/assets/images/categories/nails.jpg'),
  'brows-lashes': require('@/assets/images/categories/brows-lashes.jpg'),
  makeup: require('@/assets/images/categories/makeup.jpg'),
  hair: require('@/assets/images/categories/hair.jpg'),
  laser: require('@/assets/images/categories/laser.png'),
  wigs: require('@/assets/images/categories/wigs.jpg'),
  facials: require('@/assets/images/categories/facials.jpg'),
  massage: require('@/assets/images/categories/massage.jpg'),
  tanning: require('@/assets/images/categories/tanning.png'),
  'permanent-makeup': require('@/assets/images/categories/permanent-makeup.png'),
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
