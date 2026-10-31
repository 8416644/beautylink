/**
 * BeautyLink design tokens, taken from the screen designs.
 * The app is light-only and Hebrew-only (right to left).
 */

// Antique rose for main actions, lavender for secondary highlights.
export const Colors = {
  background: '#FBF8FC',
  surface: '#FFFFFF',
  text: '#1E1A24',
  textSecondary: '#675E70',
  border: '#ECE3EE',
  accent: '#B5506F',
  accentPressed: '#8E3A55',
  accentTint: '#F7E4EA',
  accentOnTint: '#8E3A55',
  secondaryTint: '#EDE6FA',
  secondaryOnTint: '#5B3FA8',
  placeholder: '#ECE4F6',
  star: '#B7791F',
} as const;

export const Fonts = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  bold: 'Heebo_700Bold',
  displayMedium: 'Rubik_500Medium',
  displayBold: 'Rubik_700Bold',
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
  small: 12,
  medium: 16,
  pill: 999,
} as const;

export const MaxContentWidth = 720;
