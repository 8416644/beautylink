import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { PhotoViewer } from '@/components/photo-viewer';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchAllPhotos, setPhotoHidden, type AdminPhoto } from '@/lib/portfolio';
import { useAsync } from '@/lib/use-async';

// The admin looks over the newest portfolio photos and hides any that are not modest.
// A hidden photo leaves the inspiration feed and the pro's page; the pro still sees it.
export default function AdminPhotosScreen() {
  const { loading, session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [filter, setFilter] = useState<'all' | 'hidden'>('all');
  const [viewing, setViewing] = useState<AdminPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state, reload } = useAsync(isAdmin ? 'admin-photos' : null, fetchAllPhotos);
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth = gridWidth > 0 ? Math.floor((gridWidth - 2 * Spacing.two) / 3) : undefined;

  if (loading || (session !== null && profile === null)) {
    return (
      <Screen inTabs={false}>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen inTabs={false}>
        <Text variant="title">תמונות</Text>
        <View style={styles.card}>
          <Text>המסך הזה מיועד למנהלי BeautyLink בלבד.</Text>
        </View>
      </Screen>
    );
  }

  async function toggle(photo: AdminPhoto) {
    setBusy(true);
    setError(null);
    try {
      await setPhotoHidden(photo.id, !photo.is_hidden);
      setViewing(null);
      reload();
    } catch {
      setError('הפעולה לא הצליחה. כדאי לנסות שוב.');
    } finally {
      setBusy(false);
    }
  }

  const photos =
    state.status === 'ready'
      ? filter === 'hidden'
        ? state.data.filter((p) => p.is_hidden)
        : state.data
      : [];

  return (
    <Screen inTabs={false}>
      <Text variant="title">תמונות</Text>
      <Text muted>
        העבודות האחרונות שבעלות המקצוע העלו. תמונה לא צנועה אפשר להסתיר: היא לא תופיע בפיד
        ההשראה ובדף של בעלת המקצוע.
      </Text>
      <View style={styles.chips}>
        <Chip label="כל התמונות" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="מוסתרות" selected={filter === 'hidden'} onPress={() => setFilter('hidden')} />
      </View>

      {state.status === 'loading' ? (
        <Text muted>טוענים…</Text>
      ) : state.status === 'error' ? (
        <>
          <View style={styles.card}>
            <Text muted>לא הצלחנו לטעון את התמונות. כדאי לבדוק את החיבור לאינטרנט.</Text>
          </View>
          <Button label="לנסות שוב" onPress={reload} />
        </>
      ) : photos.length === 0 ? (
        <View style={styles.card}>
          <Text muted>{filter === 'hidden' ? 'אין תמונות מוסתרות.' : 'עדיין אין תמונות.'}</Text>
        </View>
      ) : (
        <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
          {photos.map((photo) => (
            <Pressable
              key={photo.id}
              style={StyleSheet.flatten([styles.tile, tileWidth !== undefined && { width: tileWidth }])}
              onPress={() => {
                setError(null);
                setViewing(photo);
              }}
              accessibilityRole="button"
              accessibilityLabel={`תמונה של ${photo.pro_profiles?.display_name ?? 'בעלת מקצוע'}${photo.is_hidden ? ', מוסתרת' : ''}`}>
              <Image
                source={{ uri: photo.media_url }}
                style={[styles.photo, photo.is_hidden && styles.photoHidden]}
                contentFit="cover"
              />
              <Text variant="caption" muted numberOfLines={1}>
                {photo.is_hidden ? 'מוסתרת · ' : ''}
                {photo.pro_profiles?.display_name ?? ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <PhotoViewer
        uri={viewing?.media_url ?? null}
        caption={viewing ? `${viewing.pro_profiles?.display_name ?? ''}${viewing.caption ? ` · ${viewing.caption}` : ''}` : null}
        onClose={() => setViewing(null)}
        footer={
          viewing ? (
            <View style={styles.viewerFooter}>
              <Button
                label={viewing.is_hidden ? 'החזרת התמונה' : 'הסתרת התמונה'}
                onPress={() => toggle(viewing)}
                busy={busy}
              />
              {error ? (
                <Text variant="small" style={styles.viewerError} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: '31%',
    gap: 2,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.small,
    backgroundColor: Colors.placeholder,
  },
  photoHidden: {
    opacity: 0.35,
  },
  viewerFooter: {
    gap: Spacing.two,
  },
  viewerError: {
    color: '#FFB4C6',
  },
});
