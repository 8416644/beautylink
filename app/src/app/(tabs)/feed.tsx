import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { LikeButton } from '@/components/like-button';
import { PhotoViewer } from '@/components/photo-viewer';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { fetchShowingAds, type Ad } from '@/lib/ads';
import { useCategories } from '@/lib/categories';
import { FEED_PAGE, fetchFeedPage, type FeedPhoto } from '@/lib/feed';
import { useRefreshGeneration } from '@/lib/refresh';
import { useAuth } from '@/lib/auth';
import { loadMyLikes, useLikes } from '@/lib/photo-social';
import { useAsync } from '@/lib/use-async';

type Feed = {
  category: number | null;
  photos: FeedPhoto[];
  // More photos may be waiting further back.
  more: boolean;
  status: 'ready' | 'loading-more' | 'error';
};

// Inspiration: running promotions, then the newest work from every pro's portfolio,
// filtered by category, a page at a time.
export default function FeedScreen() {
  const { state: categoriesState } = useCategories();
  const categories = categoriesState.status === 'ready' ? categoriesState.categories : [];
  const { state: adsState } = useAsync('feed-promos', fetchShowingAds);
  const promos = adsState.status === 'ready' ? adsState.data.filter((ad) => ad.pro_id) : [];

  const [category, setCategory] = useState<number | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [viewing, setViewing] = useState<FeedPhoto | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const generation = useRefreshGeneration();

  // Fill the hearts of photos this user already liked.
  const { session } = useAuth();
  const photoIds = (feed?.photos ?? []).map((p) => p.id).join(',');
  useLikes();
  useEffect(() => {
    if (session && photoIds) loadMyLikes(photoIds.split(','));
  }, [session, photoIds]);

  useEffect(() => {
    let cancelled = false;
    fetchFeedPage(category, null).then(
      (photos) =>
        !cancelled &&
        setFeed({ category, photos, more: photos.length === FEED_PAGE, status: 'ready' }),
      () => !cancelled && setFeed({ category, photos: [], more: false, status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [category, attempt, generation]);

  // A feed left from another category counts as still loading.
  const current = feed?.category === category ? feed : null;

  function loadMore() {
    if (!current || current.photos.length === 0) return;
    const before = current.photos[current.photos.length - 1].created_at;
    setFeed({ ...current, status: 'loading-more' });
    fetchFeedPage(category, before).then(
      (next) =>
        setFeed((f) =>
          f && f.category === category
            ? { ...f, photos: [...f.photos, ...next], more: next.length === FEED_PAGE, status: 'ready' }
            : f,
        ),
      () => setFeed((f) => (f && f.category === category ? { ...f, status: 'ready' } : f)),
    );
  }

  const tileWidth = gridWidth > 0 ? Math.floor((gridWidth - Spacing.two) / 2) : undefined;

  return (
    <Screen>
      <Text variant="title">השראה</Text>
      <Text muted>עבודות אחרונות של בעלות המקצוע</Text>

      {promos.length > 0 && (
        <View style={styles.section}>
          <Text variant="heading">מבצעים עכשיו</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoRow}>
            {promos.map((ad) => (
              <PromoCard key={ad.id} ad={ad} />
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="הכול" selected={category === null} onPress={() => setCategory(null)} />
        {categories.map((c) => (
          <FilterChip key={c.id} label={c.name} selected={category === c.id} onPress={() => setCategory(c.id)} />
        ))}
      </ScrollView>

      {current === null ? (
        <Text muted>טוענים עבודות…</Text>
      ) : current.status === 'error' ? (
        <>
          <View style={styles.card}>
            <Text muted>לא הצלחנו לטעון את העבודות. כדאי לבדוק את החיבור לאינטרנט.</Text>
          </View>
          <Button label="לנסות שוב" onPress={() => setAttempt((n) => n + 1)} />
        </>
      ) : current.photos.length === 0 ? (
        <View style={styles.card}>
          <Text variant="smallBold">עוד אין כאן עבודות</Text>
          <Text muted>
            {category === null
              ? 'כשבעלות המקצוע יעלו עבודות לתיק העבודות שלהן, הן יופיעו כאן.'
              : 'עוד אין עבודות בתחום הזה. אפשר לבחור "הכול" או תחום אחר.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
            {current.photos.map((photo) => (
              <View
                key={photo.id}
                style={StyleSheet.flatten([styles.tile, tileWidth !== undefined && { width: tileWidth }])}>
                {/* The photo and the like are separate buttons (a button inside a button
                    breaks on the web). */}
                <Pressable
                  onPress={() => setViewing(photo)}
                  accessibilityRole="button"
                  accessibilityLabel={`${photo.caption ?? 'עבודה'} של ${photo.pro_name}`}>
                  <Image source={{ uri: photo.media_url }} style={styles.photo} contentFit="cover" />
                </Pressable>
                <View style={styles.tileFoot}>
                  <Text variant="caption" muted numberOfLines={1} style={styles.tileName}>
                    {photo.pro_name}
                  </Text>
                  <LikeButton photoId={photo.id} count={photo.like_count} size={16} />
                  {photo.comment_count > 0 ? (
                    <Text variant="caption" muted>
                      {photo.comment_count} תגובות
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          {current.more && (
            <Button
              label="עוד עבודות"
              variant="secondary"
              onPress={loadMore}
              busy={current.status === 'loading-more'}
            />
          )}
        </>
      )}

      <PhotoViewer
        uri={viewing?.media_url ?? null}
        caption={viewing?.caption}
        onClose={() => setViewing(null)}
        footer={
          viewing ? (
            <View style={styles.viewerFooter}>
              <Text variant="smallBold" style={styles.viewerName}>
                {viewing.pro_name}
              </Text>
              <LikeButton photoId={viewing.id} count={viewing.like_count} light />
              <Pressable
                style={styles.viewerComments}
                onPress={() => {
                  const id = viewing.id;
                  setViewing(null);
                  router.push({ pathname: '/photo/[id]', params: { id } });
                }}
                accessibilityRole="link">
                <Text variant="smallBold" style={styles.viewerName}>
                  {viewing.comment_count > 0 ? `${viewing.comment_count} תגובות` : 'תגובה'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.viewerLink}
                onPress={() => {
                  const id = viewing.pro_id;
                  setViewing(null);
                  router.push({ pathname: '/pro/[id]', params: { id } });
                }}
                accessibilityRole="link">
                <Text variant="smallBold" style={styles.viewerLinkText}>
                  לדף שלה
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      <Text variant="small" style={selected && styles.chipSelectedText}>
        {label}
      </Text>
    </Pressable>
  );
}

function PromoCard({ ad }: { ad: Ad }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.promo, pressed && styles.pressed]}
      onPress={() =>
        router.push(
          ad.details
            ? { pathname: '/promo/[id]', params: { id: ad.id } }
            : { pathname: '/pro/[id]', params: { id: ad.pro_id! } },
        )
      }
      accessibilityRole="link">
      <View style={styles.promoTag}>
        <Text variant="caption" style={styles.promoTagText}>
          מבצע
        </Text>
      </View>
      <Text variant="smallBold" style={styles.promoTitle} numberOfLines={1}>
        {ad.title}
      </Text>
      {ad.subtitle ? (
        <Text variant="caption" style={styles.promoSub} numberOfLines={2}>
          {ad.subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  promoRow: {
    gap: Spacing.two,
  },
  promo: {
    width: 200,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
  promoTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.inkAccent,
  },
  promoTagText: {
    color: Colors.ink,
  },
  promoTitle: {
    color: Colors.onInk,
  },
  promoSub: {
    color: Colors.onInkMuted,
  },
  chips: {
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  chipSelectedText: {
    color: Colors.onInk,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: '48%',
    gap: Spacing.one,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.small,
    backgroundColor: Colors.placeholder,
  },
  tileFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tileName: {
    flex: 1,
  },
  viewerComments: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  viewerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  viewerName: {
    flex: 1,
    color: '#FFFFFF',
  },
  viewerLink: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.inkAccent,
  },
  viewerLinkText: {
    color: Colors.ink,
  },
});
