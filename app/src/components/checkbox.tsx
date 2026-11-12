import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { Colors, Spacing } from '@/constants/theme';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
};

// A box the user ticks herself, with its label beside it; the whole row is the target.
export function Checkbox({ checked, onChange, label, hint }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? (
          <Icon name={{ ios: 'checkmark', android: 'check', web: 'check' }} color={Colors.surface} size={16} />
        ) : null}
      </View>
      <View style={styles.texts}>
        <Text variant="small">{label}</Text>
        {hint ? (
          <Text variant="caption" muted>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: Colors.accent,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
