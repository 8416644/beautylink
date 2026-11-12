import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/text';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { setLike, useLikes } from '@/lib/photo-social';

const PINK = '#E0457B';
const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09' +
  'C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

// A like on a portfolio photo: a heart and the number of likes. Without an account it
// leads to sign-in. "light" draws it for a dark background (the full-screen photo).
export function LikeButton({
  photoId,
  count,
  light,
  size = 22,
}: {
  photoId: string;
  count: number;
  light?: boolean;
  size?: number;
}) {
  const { session } = useAuth();
  const { liked, delta } = useLikes();
  const isLiked = liked.has(photoId);
  const shown = Math.max(0, count + (delta.get(photoId) ?? 0));
  const idle = light ? '#FFFFFF' : Colors.textSecondary;

  function toggle() {
    if (!session) {
      router.push('/sign-in');
      return;
    }
    setLike(session.user.id, photoId, !isLiked).catch(() => {});
  }

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: isLiked }}
      accessibilityLabel={`${isLiked ? 'ביטול הלייק' : 'לייק'}, ${shown} לייקים`}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={HEART}
          fill={isLiked ? PINK : 'none'}
          stroke={isLiked ? PINK : idle}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
      <Text variant="smallBold" style={{ color: light ? '#FFFFFF' : Colors.text }}>
        {shown}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
