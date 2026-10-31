import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Radius, Spacing } from '@/constants/theme';

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;
const BUTTON_STEP = 1.5;

type PhotoViewerProps = {
  uri: string | null;
  caption?: string | null;
  onClose: () => void;
  // Actions under the photo, such as approving it before upload.
  footer?: ReactNode;
};

// A photo on a dark full screen. It zooms with a pinch, a double tap or the + and -
// buttons, and a zoomed photo is dragged around with a finger or the mouse.
export function PhotoViewer({ uri, caption, onClose, footer }: PhotoViewerProps) {
  return (
    <Modal visible={uri !== null} animationType="fade" onRequestClose={onClose}>
      {/* A modal is a separate native window, so it needs its own gesture root. */}
      <GestureHandlerRootView style={styles.root}>
        {uri !== null && (
          <ViewerContent key={uri} uri={uri} caption={caption} onClose={onClose} footer={footer} />
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

function ViewerContent({ uri, caption, onClose, footer }: PhotoViewerProps & { uri: string }) {
  const insets = useSafeAreaInsets();
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  // Keeps the zoomed photo covering the screen: it can move only as far as its edges.
  function clampOffsets() {
    'worklet';
    const maxX = (width.value * (scale.value - 1)) / 2;
    const maxY = (height.value * (scale.value - 1)) / 2;
    x.value = Math.min(maxX, Math.max(-maxX, x.value));
    y.value = Math.min(maxY, Math.max(-maxY, y.value));
  }

  function zoomTo(target: number) {
    'worklet';
    const next = Math.min(MAX_ZOOM, Math.max(1, target));
    const ratio = next / scale.value;
    scale.value = withTiming(next);
    const maxX = (width.value * (next - 1)) / 2;
    const maxY = (height.value * (next - 1)) / 2;
    x.value = withTiming(Math.min(maxX, Math.max(-maxX, x.value * ratio)));
    y.value = withTiming(Math.min(maxY, Math.max(-maxY, y.value * ratio)));
  }

  const pinch = usePinchGesture({
    onActivate: () => {
      'worklet';
      startScale.value = scale.value;
    },
    onUpdate: (e) => {
      'worklet';
      scale.value = Math.min(MAX_ZOOM, Math.max(1, startScale.value * e.scale));
      clampOffsets();
    },
  });

  const pan = usePanGesture({
    onUpdate: (e) => {
      'worklet';
      x.value += e.changeX;
      y.value += e.changeY;
      clampOffsets();
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      zoomTo(scale.value > 1 ? 1 : DOUBLE_TAP_ZOOM);
    },
  });

  const gestures = useSimultaneousGestures(pinch, pan, doubleTap);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <ControlButton label="סגירה" onPress={onClose} />
        <View style={styles.zoom}>
          <ControlButton label="−" onPress={() => zoomTo(scale.value / BUTTON_STEP)} />
          <ControlButton label="+" onPress={() => zoomTo(scale.value * BUTTON_STEP)} />
        </View>
      </View>

      <GestureDetector gesture={gestures}>
        <View
          style={styles.area}
          onLayout={(e) => {
            // set() rather than .value, which the React Compiler treats as a mutation.
            width.set(e.nativeEvent.layout.width);
            height.set(e.nativeEvent.layout.height);
          }}>
          <Animated.View style={[styles.fill, photoStyle]}>
            <Image
              source={{ uri }}
              style={styles.fill}
              contentFit="contain"
              accessibilityLabel={caption ?? 'תמונה'}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      <Text variant="caption" style={[styles.light, styles.hint]}>
        צביטה או הקשה כפולה להגדלה
      </Text>
      {caption ? (
        <Text variant="small" style={[styles.light, styles.caption]}>
          {caption}
        </Text>
      ) : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

function ControlButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.control}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'הגדלה' : label === '−' ? 'הקטנה' : label}>
      <Text variant="smallBold" style={styles.light}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#111014',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  zoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  control: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  light: {
    color: '#FFFFFF',
  },
  area: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  hint: {
    opacity: 0.7,
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
  caption: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.two,
    padding: Spacing.four,
  },
});
