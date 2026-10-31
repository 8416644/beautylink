import { Image } from 'expo-image';
import { useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Radius, Spacing } from '@/constants/theme';

const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];
const DOUBLE_TAP_MS = 300;

type PhotoViewerProps = {
  uri: string | null;
  caption?: string | null;
  onClose: () => void;
  // Actions under the photo, such as approving it before upload.
  footer?: ReactNode;
};

// A photo on a dark full screen. The + and - buttons, or a double tap, zoom in, and a
// zoomed photo scrolls in every direction.
export function PhotoViewer({ uri, caption, onClose, footer }: PhotoViewerProps) {
  return (
    <Modal visible={uri !== null} animationType="fade" onRequestClose={onClose}>
      {uri !== null && (
        <ViewerContent key={uri} uri={uri} caption={caption} onClose={onClose} footer={footer} />
      )}
    </Modal>
  );
}

function ViewerContent({ uri, caption, onClose, footer }: PhotoViewerProps & { uri: string }) {
  const insets = useSafeAreaInsets();
  const [level, setLevel] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const lastTap = useRef(0);
  const zoom = ZOOM_LEVELS[level];

  function tap() {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      setLevel((l) => (l === 0 ? 2 : 0));
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  const photo = (
    <Pressable onPress={tap} accessibilityLabel="הקשה כפולה להגדלה">
      <Image
        source={{ uri }}
        style={{ width: area.width * zoom, height: area.height * zoom }}
        contentFit="contain"
        accessibilityLabel={caption ?? 'תמונה'}
      />
    </Pressable>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <ControlButton label="סגירה" onPress={onClose} />
        <View style={styles.zoom}>
          <ControlButton label="−" onPress={() => setLevel((l) => Math.max(0, l - 1))} disabled={level === 0} />
          <Text variant="smallBold" style={styles.light}>
            {Math.round(zoom * 100)}%
          </Text>
          <ControlButton
            label="+"
            onPress={() => setLevel((l) => Math.min(ZOOM_LEVELS.length - 1, l + 1))}
            disabled={level === ZOOM_LEVELS.length - 1}
          />
        </View>
      </View>

      <View
        style={styles.area}
        onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {area.width === 0 ? null : zoom === 1 ? (
          photo
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ScrollView showsVerticalScrollIndicator={false}>{photo}</ScrollView>
          </ScrollView>
        )}
      </View>

      {caption ? (
        <Text variant="small" style={[styles.light, styles.caption]}>
          {caption}
        </Text>
      ) : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

function ControlButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.control, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'הגדלה' : label === '−' ? 'הקטנה' : label}>
      <Text variant="smallBold" style={styles.light}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  disabled: {
    opacity: 0.4,
  },
  light: {
    color: '#FFFFFF',
  },
  area: {
    flex: 1,
    overflow: 'hidden',
  },
  caption: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.two,
    padding: Spacing.four,
  },
});
