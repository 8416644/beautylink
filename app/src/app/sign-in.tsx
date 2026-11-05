import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { GoogleLogo } from '@/components/google-logo';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage as errorMessage } from '@/lib/auth-errors';
import { signInWithGoogle } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/profile');
}

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentConfirmation, setSentConfirmation] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [sentReset, setSentReset] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const signUp = mode === 'sign-up';
  const canSubmit = email.trim() !== '' && password !== '' && (!signUp || fullName.trim() !== '');

  async function submit() {
    setBusy(true);
    setError(null);
    if (signUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Read by handle_new_user to fill profiles.full_name.
          data: { full_name: fullName.trim() },
          // The confirmation link brings a web user back to the app.
          emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
        },
      });
      setBusy(false);
      if (error) return setError(errorMessage(error.message));
      // With email confirmation on, there is no session until the link is opened.
      if (!data.session) return setSentConfirmation(true);
      leave();
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return setError(errorMessage(error.message));
      leave();
    }
  }

  async function google() {
    setGoogleBusy(true);
    setError(null);
    try {
      if (await signInWithGoogle()) leave();
    } catch {
      setError('ההתחברות עם Google לא הצליחה. כדאי לנסות שוב.');
    } finally {
      setGoogleBusy(false);
    }
  }

  async function sendReset() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // The link signs the user in and opens the new password screen. Supabase falls back
      // to the project's Site URL when this address is not in its allowed redirect list.
      redirectTo: Platform.OS === 'web' ? `${window.location.origin}/set-password` : undefined,
    });
    setBusy(false);
    if (error) return setError(errorMessage(error.message));
    setSentReset(true);
  }

  if (forgot) {
    return (
      <Screen>
        <Text variant="title">שכחתי סיסמה</Text>
        {sentReset ? (
          <View style={styles.card}>
            <Text>
              אם יש חשבון עם המייל {email.trim()}, שלחנו אליו קישור. הקישור מחבר אותך ופותח מסך
              לבחירת סיסמה חדשה.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Text muted>נשלח קישור למייל, ובו תוכלי לבחור סיסמה חדשה.</Text>
            <TextField
              label="מייל"
              ltr
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {error ? (
              <Text variant="small" style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
            <Button
              label="שליחת קישור"
              onPress={sendReset}
              disabled={email.trim() === ''}
              busy={busy}
            />
          </View>
        )}
        <Button
          label="חזרה להתחברות"
          variant="secondary"
          onPress={() => {
            setForgot(false);
            setSentReset(false);
            setError(null);
          }}
        />
      </Screen>
    );
  }

  if (sentConfirmation) {
    return (
      <Screen>
        <Text variant="title">כמעט סיימנו</Text>
        <View style={styles.card}>
          <Text>
            שלחנו קישור לאישור החשבון אל {email.trim()}. אחרי הלחיצה על הקישור אפשר לחזור לכאן
            ולהתחבר.
          </Text>
        </View>
        <Button
          label="למסך ההתחברות"
          onPress={() => {
            setSentConfirmation(false);
            setMode('sign-in');
            setPassword('');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">{signUp ? 'הרשמה ל-BeautyLink' : 'התחברות'}</Text>

      <View style={styles.tabs}>
        {(['sign-in', 'sign-up'] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.tab, mode === m && styles.tabActive]}
            onPress={() => {
              setMode(m);
              setError(null);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}>
            <Text variant="smallBold" style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'sign-in' ? 'יש לי חשבון' : 'חשבון חדש'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.form}>
        {signUp && (
          <TextField
            label="שם מלא"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            textContentType="name"
          />
        )}
        <TextField
          label="מייל"
          ltr
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="סיסמה"
          ltr
          value={password}
          onChangeText={setPassword}
          password
          autoComplete={signUp ? 'new-password' : 'current-password'}
          textContentType={signUp ? 'newPassword' : 'password'}
          hint={signUp ? 'לפחות 6 תווים' : undefined}
          onSubmitEditing={canSubmit ? submit : undefined}
        />
        {error ? (
          <Text variant="small" style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button
          label={signUp ? 'יצירת חשבון' : 'התחברות'}
          onPress={submit}
          disabled={!canSubmit}
          busy={busy}
        />
        {!signUp && (
          <Pressable
            onPress={() => {
              setForgot(true);
              setError(null);
            }}
            accessibilityRole="button">
            <Text variant="smallBold" style={styles.link}>
              שכחתי סיסמה
            </Text>
          </Pressable>
        )}
      </View>

      <Text variant="caption" muted style={styles.consent}>
        בהרשמה או בכניסה את מסכימה ל
        <Text variant="caption" style={styles.link} onPress={() => router.push('/terms')} accessibilityRole="link">
          תנאי השימוש
        </Text>
        {' ול'}
        <Text variant="caption" style={styles.link} onPress={() => router.push('/privacy')} accessibilityRole="link">
          מדיניות הפרטיות
        </Text>
        .
      </Text>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text variant="caption" muted>
          או
        </Text>
        <View style={styles.orLine} />
      </View>
      <Pressable
        style={({ pressed }) => [styles.google, pressed && styles.googlePressed]}
        onPress={google}
        disabled={googleBusy}
        accessibilityRole="button"
        accessibilityLabel="המשך עם Google">
        <GoogleLogo size={20} />
        <Text variant="smallBold">{googleBusy ? 'מתחברים…' : 'המשך עם Google'}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  consent: {
    textAlign: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    minHeight: 52,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  googlePressed: {
    borderColor: Colors.accent,
  },
  tabs: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.placeholder,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  tabActive: {
    backgroundColor: Colors.surface,
  },
  tabText: {
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.text,
  },
  form: {
    gap: Spacing.four,
  },
  error: {
    color: Colors.accentPressed,
  },
  link: {
    color: Colors.accent,
    textAlign: 'center',
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
