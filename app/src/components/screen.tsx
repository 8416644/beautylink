import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  MaxContentWidth,
  Spacing,
  TAB_BAR_HEIGHT,
  TAB_BAR_SPACE,
} from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  // Pinned just above the floating tab bar, outside the scrolling content (the home
  // screen's ads strip). The content leaves footerHeight of extra room for it.
  footer?: ReactNode;
  footerHeight?: number;
};

// Keeps the field being typed in above the phone's keyboard: iOS scrolls it into view
// itself, and on Android the screen shrinks to the space above the keyboard.
export function Screen({ children, footer, footerHeight = 0 }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'android' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            footer ? { paddingBottom: TAB_BAR_SPACE + footerHeight } : null,
          ]}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? (
          <View
            style={[styles.footer, { bottom: insets.bottom + Spacing.two + TAB_BAR_HEIGHT + Spacing.two }]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: TAB_BAR_SPACE,
    gap: Spacing.six,
  },
  // Lines up with the floating tab bar's sides.
  footer: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
  },
});
