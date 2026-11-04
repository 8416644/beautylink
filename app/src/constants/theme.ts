/**
 * BeautyLink design tokens, taken from the screen designs.
 * The app is light-only and Hebrew-only (right to left).
 */

// Blush and rose set the mood; near-black ink marks what matters most: the main action,
// the selected option, the brand. Lavender stays for secondary highlights.
export const Colors = {
  background: '#FFF6F7',
  surface: '#FFFFFF',
  text: '#1A1416',
  textSecondary: '#76676D',
  border: '#F2D6DF',
  accent: '#B5506F',
  accentPressed: '#8E3A55',
  accentTint: '#FBE3EA',
  accentOnTint: '#A33E62',
  secondaryTint: '#EFE6FB',
  secondaryOnTint: '#6B4FB0',
  placeholder: '#F6E4EA',
  star: '#B7791F',
  ink: '#1A1416',
  inkPressed: '#3A2E33',
  onInk: '#FFF6F7',
  onInkMuted: '#A3969B',
  // Rose that reads on ink, for highlights on dark surfaces.
  inkAccent: '#E7A8BD',
} as const;

// Rubik throughout: regular for text, medium for emphasis and headings.
export const Fonts = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  bold: 'Rubik_500Medium',
  displayMedium: 'Rubik_500Medium',
  displayBold: 'Rubik_500Medium',
} as const;

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
} as const;

export const Radius = {
  small: 14,
  medium: 20,
  pill: 999,
} as const;

export const MaxContentWidth = 720;

// The floating tab bar, and the room every screen leaves under its content so the bar
// never covers the last item.
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_SPACE = TAB_BAR_HEIGHT + 48;
