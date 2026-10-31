import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type CategorySlug =
  | 'nails'
  | 'lashes'
  | 'brows'
  | 'makeup'
  | 'hair'
  | 'facials'
  | 'hair-removal';

type CategoryIconProps = {
  // The category's icon key from the database. Unknown keys (a category
  // the admin added later) get a generic sparkle.
  slug: string;
  color: ColorValue;
  size?: number;
};

// Custom line symbols, one per category, matching the screen designs.
export function CategoryIcon({ slug, color, size = 30 }: CategoryIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round">
      {shapes[(aliases[slug] ?? slug) as CategorySlug] ?? fallbackShape}
    </Svg>
  );
}

// Icon keys used in supabase/seed.sql that differ from the category slug.
const aliases: Record<string, CategorySlug> = {
  facial: 'facials',
  removal: 'hair-removal',
};

const fallbackShape = (
  <Path d="M12 3.5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" />
);

const shapes: Record<CategorySlug, React.ReactNode> = {
  // Nail polish bottle
  nails: (
    <>
      <Rect x={9.5} y={2.5} width={5} height={6.5} rx={1} />
      <Path d="M8 9h8l1.5 3v7a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 19v-7z" />
      <Path d="M6.5 14.5h11" />
    </>
  ),
  // Closed eye with long lashes
  lashes: (
    <>
      <Path d="M3 9.5c2.5 3.5 6 5 9 5s6.5-1.5 9-5" />
      <Path d="M5.5 13 4 15.5M8.8 14.6 8 17.6M12 15v3.3M15.2 14.6l.8 3M18.5 13l1.5 2.5" />
    </>
  ),
  // Brow arch over an eye
  brows: (
    <>
      <Path d="M4 8.5c2.5-2.5 6-3.5 9.5-3 2.6.4 4.8 1.6 6.5 3" />
      <Path d="M5 15c2-2.4 4.4-3.5 7-3.5s5 1.1 7 3.5c-2 2.4-4.4 3.5-7 3.5S7 17.4 5 15z" />
      <Circle cx={12} cy={15} r={1.8} />
    </>
  ),
  // Lipstick
  makeup: (
    <>
      <Path d="M8.5 21.5h7V12h-7z" />
      <Path d="M9.5 12V7.5L14.5 4v8" />
      <Path d="M8.5 15.5h7" />
    </>
  ),
  // Hair dryer
  hair: (
    <>
      <Path d="M3.5 7.5A4.5 4.5 0 0 1 8 3h7l4.5 2v5L15 12H8a4.5 4.5 0 0 1-4.5-4.5z" />
      <Circle cx={8} cy={7.5} r={1.6} />
      <Path d="M9 12l1.5 9h3L12 12" />
    </>
  ),
  // Calm face with a sparkle
  facials: (
    <>
      <Path d="M12 3c-4 0-6.5 3-6.5 7.5S8 21 12 21s6.5-6 6.5-10.5S16 3 12 3z" />
      <Path d="M8.8 10.5c.7.6 1.6.6 2.2 0M13 10.5c.7.6 1.6.6 2.2 0" />
      <Path d="M10.4 15.2c1 .6 2.2.6 3.2 0" />
      <Path d="M19.5 2.5v3M18 4h3" />
    </>
  ),
  // Wax drop with a sparkle
  'hair-removal': (
    <>
      <Path d="M12 3s5.5 6 5.5 10a5.5 5.5 0 0 1-11 0C6.5 9 12 3 12 3z" />
      <Path d="M9.5 13.5A2.5 2.5 0 0 0 12 16" />
      <Path d="M19.5 3v3M18 4.5h3" />
    </>
  ),
};
