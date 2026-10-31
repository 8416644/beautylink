import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export type TextProps = RNTextProps & {
  variant?: 'body' | 'small' | 'smallBold' | 'title' | 'heading' | 'caption';
  muted?: boolean;
};

// All app text goes through here so it is right-aligned, right-to-left and in the brand fonts.
// React Native's textAlign has no "start", so the alignment is set explicitly.
export function Text({ style, variant = 'body', muted, ...rest }: TextProps) {
  return (
    <RNText
      style={[styles.base, styles[variant], muted && styles.muted, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: Fonts.regular,
  },
  muted: {
    color: Colors.textSecondary,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.bold,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: Fonts.displayBold,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: Fonts.displayBold,
  },
});
