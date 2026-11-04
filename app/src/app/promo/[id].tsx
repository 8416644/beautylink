import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { fetchAd, formatDay } from '@/lib/ads';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/use-async';

// A promotion's own screen: its picture, the full details, its dates, and the way to book.
async function load(id: string) {
  const ad = await fetchAd(id);
  if (!ad) return null;
  let proName: string | null = null;
  if (ad.pro_id) {
    const { data } = await supabase
      .from('public_pros')
      .select('display_name')
      .eq('user_id', ad.pro_id)
      .maybeSingle();
    proName = (data?.display_name as string | undefined) ?? null;
  }
  return { ad, proName };
}

function validity(starts: string | null, ends: string | null) {
  if (starts && ends) return `בתוקף ${formatDay(starts)} – ${formatDay(ends)}`;
  if (ends) return `בתוקף עד ${formatDay(ends)}`;
  if (starts) return `בתוקף מ-${formatDay(starts)}`;
  return null;
}

export default function PromoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useAsync(id ?? null, () => load(id!));

  if (state.status === 'loading') {
    return (
      <Screen inTabs={false}>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen inTabs={false}>
        <View style={styles.card}>
          <Text muted>לא הצלחנו לטעון את המבצע. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </View>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  if (state.data === null) {
    return (
      <Screen inTabs={false}>
        <View style={styles.card}>
          <Text variant="smallBold">המבצע הזה כבר לא פעיל</Text>
          <Text muted>אפשר לחפש בעלות מקצוע ומבצעים אחרים.</Text>
        </View>
        <Button label="לחיפוש" onPress={() => router.replace('/search')} />
      </Screen>
    );
  }

  const { ad, proName } = state.data;
  const dates = validity(ad.starts_on, ad.ends_on);
  const proId = ad.pro_id;

  return (
    <Screen inTabs={false}>
      {ad.image_url ? (
        <Image source={{ uri: ad.image_url }} style={styles.image} contentFit="cover" />
      ) : null}
      <View style={styles.tag}>
        <Text variant="caption" style={styles.tagText}>
          {proName ? `מבצע · ${proName}` : 'מבצע'}
        </Text>
      </View>
      <Text variant="title">{ad.title}</Text>
      {ad.subtitle ? <Text muted>{ad.subtitle}</Text> : null}
      {ad.details ? (
        <View style={styles.card}>
          <Text>{ad.details}</Text>
        </View>
      ) : null}
      {dates ? (
        <Text variant="small" muted>
          {dates}
        </Text>
      ) : null}

      {proId ? (
        <>
          <Button
            label="קביעת תור"
            onPress={() => router.push({ pathname: '/book/[id]', params: { id: proId } })}
          />
          <Button
            label={proName ? `לדף של ${proName}` : 'לדף של בעלת המקצוע'}
            variant="secondary"
            onPress={() => router.push({ pathname: '/pro/[id]', params: { id: proId } })}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 200,
    borderRadius: Radius.medium,
    backgroundColor: Colors.placeholder,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentTint,
  },
  tagText: {
    color: Colors.accentOnTint,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
