import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  // Email addresses, passwords and links read left to right even in a Hebrew form.
  ltr?: boolean;
  // Hides what is typed, with a button that shows it.
  password?: boolean;
};

export function TextField({ label, hint, ltr, multiline, password, style, ...rest }: TextFieldProps) {
  const [shown, setShown] = useState(false);

  const input = (
    <TextInput
      placeholderTextColor={Colors.textSecondary}
      multiline={multiline}
      style={[
        styles.input,
        ltr ? styles.ltr : styles.rtl,
        multiline && styles.multiline,
        password && styles.inputInBox,
        style,
      ]}
      {...rest}
      secureTextEntry={password ? !shown : rest.secureTextEntry}
    />
  );

  return (
    <View style={styles.field}>
      <Text variant="smallBold">{label}</Text>
      {password ? (
        <View style={styles.box}>
          {input}
          <Pressable
            onPress={() => setShown((s) => !s)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={shown ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}>
            <Text variant="smallBold" style={styles.toggleText}>
              {shown ? 'הסתרה' : 'הצגה'}
            </Text>
          </Pressable>
        </View>
      ) : (
        input
      )}
      {hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ltr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  // A password field and its show button share one bordered box.
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputInBox: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  toggle: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  toggleText: {
    color: Colors.accent,
  },
});
