import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, type ComponentRef, type ReactNode } from 'react';
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
  // Pinned at the bottom, outside the scrolling content (the home screen's ads strip, a
  // pro page's booking button). The content leaves footerHeight of extra room for it.
  footer?: ReactNode;
  footerHeight?: number;
  // Whether the screen is one of the tabs, so the footer sits above the floating tab bar;
  // other screens pin it near the bottom edge.
  inTabs?: boolean;
};

// Keeps the field being typed in above the phone's keyboard: iOS scrolls it into view
// itself, and on Android the screen shrinks to the space above the keyboard.
export function Screen({ children, footer, footerHeight = 0, inTabs = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  // Room under the content, so the last item can scroll clear of everything pinned at the
  // bottom: the phone's own bottom bar, the floating tab bar and the footer.
  const bottomRoom =
    insets.bottom + TAB_BAR_SPACE + (footer ? footerHeight + Spacing.two : 0);
  const footerBottom = insets.bottom + Spacing.two + (inTabs ? TAB_BAR_HEIGHT + Spacing.two : 0);

  // Every screen shows from its top whenever it is opened: a tab keeps its screen alive
  // between visits, so without this it would come back where it was left scrolled.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    }, []),
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'android' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentOffset={{ x: 0, y: 0 }}
          contentContainerStyle={[styles.content, { paddingBottom: bottomRoom }]}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? (
          <View style={[styles.footer, { bottom: footerBottom }]}>{footer}</View>
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
    gap: Spacing.six,
  },
  // Lines up with the floating tab bar's sides.
  footer: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
  },
});
