import { Linking, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

// Opens Waze navigating to the address. The universal link opens the Waze app when it is
// installed, and Waze's web page otherwise.
export function wazeLink(address: string, city: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(`${address}, ${city}`)}&navigate=yes`;
}

export function WazeButton({ address, city }: { address: string; city: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={() => Linking.openURL(wazeLink(address, city))}
      accessibilityRole="link"
      accessibilityLabel={`ניווט בוויז אל ${address}, ${city}`}>
      <Text variant="smallBold" style={styles.text}>
        ניווט בוויז
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: '#33CCFF',
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    color: Colors.ink,
  },
});
