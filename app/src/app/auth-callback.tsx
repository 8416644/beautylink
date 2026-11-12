import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { applyOptInAfterRedirect } from '@/lib/marketing';
import { sessionFromUrl } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

// Where Google sign-in comes back to. On the web the page itself carries the session; on a
// phone the in-app browser usually hands it to the sign-in screen first, and a link that
// still lands here is read the same way.
export default function AuthCallbackScreen() {
  const [failed, setFailed] = useState(false);
  const linkUrl = Linking.useLinkingURL();

  useEffect(() => {
    const url = Platform.OS === 'web' ? window.location.href : linkUrl;
    if (!url) return;
    let cancelled = false;
    sessionFromUrl(url)
      .catch(() => false)
      .then(async (signedIn) => {
        if (cancelled) return;
        // On the web the library may have finished the sign-in before this ran.
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          // The consent box ticked before Google sign-in left the page.
          await applyOptInAfterRedirect(data.session.user.id).catch(() => {});
          if (cancelled) return;
        }
        if (signedIn || data.session) router.replace('/profile');
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [linkUrl]);

  return (
    <Screen inTabs={false}>
      {failed ? (
        <>
          <View style={styles.card}>
            <Text>ההתחברות עם Google לא הצליחה. אפשר לנסות שוב.</Text>
          </View>
          <Button label="למסך ההתחברות" onPress={() => router.replace('/sign-in')} />
        </>
      ) : (
        <Text muted>מתחברים…</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
