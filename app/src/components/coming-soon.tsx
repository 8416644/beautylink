import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Screen>
      <Text variant="title">{title}</Text>
      <View style={styles.card}>
        <Text muted>{description}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.four,
  },
});
