import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { setFavorite, useFavoriteIds } from '@/lib/favorites';

// A clear pink, so a saved heart reads as pink and not as dark rose or black.
const HEART_PINK = '#E0457B';
const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09' +
  'C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

// A heart that saves the pro to the client's favorites. Without an account it leads to
// sign-in. "onPhoto" sits in a white circle, for use over a picture.
// Drawn rather than taken from the icon font, so it looks and colors the same on every phone.
export function FavoriteButton({
  proId,
  proName,
  onPhoto,
}: {
  proId: string;
  proName: string;
  onPhoto?: boolean;
}) {
  const { session } = useAuth();
  const saved = useFavoriteIds().has(proId);
  const size = onPhoto ? 22 : 24;

  function toggle() {
    if (!session) {
      router.push('/sign-in');
      return;
    }
    setFavorite(session.user.id, proId, !saved).catch(() => {});
  }

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      style={({ pressed }) => [onPhoto && styles.circle, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? `הסרת ${proName} מהמועדפות` : `שמירת ${proName} במועדפות`}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={HEART_PATH}
          fill={saved ? HEART_PINK : 'none'}
          stroke={saved ? HEART_PINK : onPhoto ? Colors.text : Colors.textSecondary}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
});
