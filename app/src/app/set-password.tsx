import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

// Reached from the profile screen, or from the password reset email, whose link signs
// the user in before it lands here.
export default function SetPasswordScreen() {
  const { loading, session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (loading) return <Screen>{null}</Screen>;

  if (!session) {
    return (
      <Screen>
        <Text variant="title">סיסמה חדשה</Text>
        <View style={styles.card}>
          <Text>
            כדי לבחור סיסמה חדשה צריך להיות מחוברת. אם הגעת מהקישור במייל, ייתכן שהוא כבר לא בתוקף.
            אפשר לבקש קישור חדש במסך ההתחברות, בלחיצה על &quot;שכחתי סיסמה&quot;.
          </Text>
        </View>
        <Button label="למסך ההתחברות" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <Text variant="title">הסיסמה עודכנה</Text>
        <View style={styles.card}>
          <Text>מהפעם הבאה מתחברים עם הסיסמה החדשה.</Text>
        </View>
        <Button label="לפרופיל" onPress={() => router.replace('/profile')} />
      </Screen>
    );
  }

  const mismatch = confirm !== '' && confirm !== password;
  const canSubmit = password.length >= 6 && confirm === password;

  async function submit() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(authErrorMessage(error.message));
    setDone(true);
  }

  return (
    <Screen>
      <Text variant="title">סיסמה חדשה</Text>
      <Text muted>{session.user.email}</Text>
      <View style={styles.form}>
        <TextField
          label="סיסמה חדשה"
          ltr
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          hint="לפחות 6 תווים"
        />
        <TextField
          label="שוב את הסיסמה החדשה"
          ltr
          value={confirm}
          onChangeText={setConfirm}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          hint={mismatch ? 'הסיסמאות לא זהות' : undefined}
          onSubmitEditing={canSubmit ? submit : undefined}
        />
        {error ? (
          <Text variant="small" style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button label="שמירת הסיסמה" onPress={submit} disabled={!canSubmit} busy={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.four,
  },
  error: {
    color: Colors.accentPressed,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
