import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { PhotoViewer } from '@/components/photo-viewer';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { fetchProPromotions, formatDay as formatAdDay, type Ad } from '@/lib/ads';
import { fetchWorkingHours, formatShifts, WEEKDAYS, type Shift } from '@/lib/hours';
import { isWebLink } from '@/lib/links';
import { fetchPortfolio, type PortfolioItem } from '@/lib/portfolio';
import { fetchPublicPro, type PublicPro } from '@/lib/pros';
import { fetchActiveServices, formatDuration, formatPrice, type Service } from '@/lib/services';
import { useAsync } from '@/lib/use-async';

// A pro's page as clients see it. Only approved pros have one.
export default function ProPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useAsync(id ?? null, async () => {
    const [pro, priceList, photos, hours, promotions] = await Promise.all([
      fetchPublicPro(id!),
      fetchActiveServices(id!),
      fetchPortfolio(id!),
      fetchWorkingHours(id!),
      // A page still shows if the promotions cannot load.
      fetchProPromotions(id!).catch(() => [] as Ad[]),
    ]);
    return pro ? { pro, priceList, photos, hours, promotions } : null;
  });

  if (state.status === 'loading') {
    return (
      <Screen>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <View style={styles.card}>
          <Text muted>לא הצלחנו לטעון את הדף. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </View>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  if (!state.data) {
    return (
      <Screen>
        <View style={styles.card}>
          <Text>בעלת המקצוע הזו לא נמצאה, או שהפרופיל שלה לא פעיל כרגע.</Text>
        </View>
        <Button label="לחיפוש" onPress={() => router.replace('/search')} />
      </Screen>
    );
  }

  const { pro, priceList, photos, hours, promotions } = state.data;
  return <ProPage pro={pro} priceList={priceList} photos={photos} hours={hours} promotions={promotions} />;
}

type ProPageProps = {
  pro: PublicPro;
  priceList: Service[];
  photos: PortfolioItem[];
  hours: Shift[];
  promotions: Ad[];
};

function ProPage({ pro, priceList, photos, hours, promotions }: ProPageProps) {
  const [viewing, setViewing] = useState<PortfolioItem | null>(null);
  // Her works first when she has photos, otherwise her price list.
  const [tab, setTab] = useState<TabKey>(photos.length > 0 ? 'works' : 'prices');
  // Her profile photo across the top; until she adds one, her newest portfolio photo.
  const cover: PortfolioItem | null = pro.cover_url
    ? { id: 'cover', media_url: pro.cover_url, caption: pro.display_name, sort: 0 }
    : (photos[0] ?? null);
  const place =[pro.neighborhood, pro.city].filter(Boolean).join(', ');
  const where = [
    pro.works_at_salon && 'בסלון',
    pro.works_at_home && 'בבית שלה',
    pro.travels_to_client &&
      `מגיעה אלייך${pro.travel_radius_km ? ` (עד ${pro.travel_radius_km} ק"מ)` : ''}`,
  ].filter((w): w is string => typeof w === 'string');
  const travelFee = Number(pro.travel_fee_ils);
  const canBook = priceList.length > 0 && hours.length > 0;
  const links = [
    { label: 'אינסטגרם', url: pro.instagram_url },
    { label: 'טיקטוק', url: pro.tiktok_url },
    { label: 'פייסבוק', url: pro.facebook_url },
  ].filter((l): l is { label: string; url: string } => isWebLink(l.url));

  return (
    <Screen>
      {/* Her newest portfolio photo across the top, with her details on a card over its
          lower edge. Without photos, the card stands alone. */}
      <View>
        {cover ? (
          <Pressable
            onPress={() => setViewing(cover)}
            accessibilityRole="button"
            accessibilityLabel={cover.caption ?? 'עבודה מתיק העבודות'}>
            <Image source={{ uri: cover.media_url }} style={styles.cover} contentFit="cover" />
          </Pressable>
        ) : null}
        <View style={[styles.headerCard, cover && styles.headerCardOverCover]}>
          <View style={styles.header}>
            <Text variant="title" style={styles.name}>
              {pro.display_name}
            </Text>
            {pro.rating_count > 0 ? (
              <View style={styles.ratingBadge}>
                <Icon name={{ ios: 'star.fill', android: 'star', web: 'star' }} size={14} color={Colors.inkAccent} />
                <Text variant="caption" style={styles.ratingText}>
                  {Number(pro.rating_avg).toFixed(1)} ({pro.rating_count})
                </Text>
              </View>
            ) : (
              <View style={styles.newBadge}>
                <Text variant="caption" style={styles.newBadgeText}>
                  חדשה
                </Text>
              </View>
            )}
          </View>
          <Text variant="small" muted>
            {place}
            {pro.years_experience !== null ? ` · ${pro.years_experience} שנות ניסיון` : ''}
          </Text>
          {where.length > 0 && (
            <View style={styles.tags}>
              {where.map((label) => (
                <Tag key={label} label={label} />
              ))}
            </View>
          )}
        </View>
      </View>

      {promotions.map((promo) => (
        <View key={promo.id} style={styles.promo}>
          <View style={styles.promoTag}>
            <Text variant="caption" style={styles.promoTagText}>
              מבצע
            </Text>
          </View>
          <Text variant="heading" style={styles.promoText}>
            {promo.title}
          </Text>
          {promo.subtitle ? <Text style={styles.promoText}>{promo.subtitle}</Text> : null}
          {promo.ends_on ? (
            <Text variant="caption" style={styles.promoMuted}>
              בתוקף עד {formatAdDay(promo.ends_on)}
            </Text>
          ) : null}
        </View>
      ))}

      {canBook && (
        <Button label="קביעת תור" onPress={() => router.push(`/book/${pro.user_id}`)} />
      )}

      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}>
            <Text variant="smallBold" style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'works' &&
        (photos.length === 0 ? (
          <Empty text="עדיין אין תמונות בתיק העבודות." />
        ) : (
          <View style={styles.gallery}>
            {photos.map((photo) => (
              <Pressable
                key={photo.id}
                style={styles.photo}
                onPress={() => setViewing(photo)}
                accessibilityRole="button"
                accessibilityLabel={photo.caption ?? 'עבודה מתיק העבודות'}>
                <Image source={{ uri: photo.media_url }} style={styles.photoImage} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        ))}

      {tab === 'prices' &&
        (priceList.length === 0 ? (
          <Empty text="עדיין אין מחירון." />
        ) : (
          <View style={styles.card}>
            {priceList.map((service, i) => (
              <Pressable
                key={service.id}
                disabled={!canBook}
                onPress={() => router.push({ pathname: '/book/[id]', params: { id: pro.user_id, service: service.id } })}
                accessibilityRole={canBook ? 'button' : undefined}
                accessibilityHint={canBook ? 'קביעת תור לטיפול הזה' : undefined}
                style={[styles.priceRow, i > 0 && styles.priceRowBorder]}>
                <View style={styles.grow}>
                  <Text variant="smallBold">{service.name}</Text>
                  <Text variant="caption" muted>
                    {formatDuration(service.duration_min)}
                  </Text>
                  {service.description ? (
                    <Text variant="caption" muted>
                      {service.description}
                    </Text>
                  ) : null}
                </View>
                <Text variant="smallBold">{formatPrice(service.price_ils)}</Text>
              </Pressable>
            ))}
          </View>
        ))}

      {tab === 'hours' &&
        (hours.length === 0 ? (
          <Empty text="עדיין לא הוגדרו שעות פעילות." />
        ) : (
          <View style={styles.card}>
            {WEEKDAYS.map((day, weekday) => {
              const today = hours.filter((s) => s.weekday === weekday);
              return (
                <View key={day} style={styles.hoursRow}>
                  <Text variant="smallBold" style={styles.hoursDay}>
                    {day}
                  </Text>
                  <Text variant="small" muted={today.length === 0} style={styles.hoursTimes}>
                    {today.length > 0 ? formatShifts(today) : 'לא עובדת'}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}

      {tab === 'about' && (
        <>
          {pro.bio ? (
            <View style={styles.card}>
              <Text>{pro.bio}</Text>
            </View>
          ) : null}
          {pro.travels_to_client && travelFee > 0 ? (
            <Text variant="small" muted>
              תוספת הגעה אלייך: {travelFee} ₪
            </Text>
          ) : null}
        </>
      )}

      {tab === 'about' && pro.services.length > 0 && (
        <Section title="תחומי טיפול">
          {pro.services.map((group) => (
            <View key={group.category} style={styles.group}>
              <Text variant="smallBold">{group.category}</Text>
              <View style={styles.tags}>
                {group.names.map((name) => (
                  <Tag key={name} label={name} />
                ))}
              </View>
            </View>
          ))}
        </Section>
      )}

      {tab === 'about' && links.length > 0 && (
        <Section title="ברשתות">
          <View style={styles.tags}>
            {links.map((link) => (
              <Pressable
                key={link.label}
                style={styles.linkButton}
                onPress={() => Linking.openURL(link.url)}
                accessibilityRole="link">
                <Text variant="smallBold" style={styles.linkText}>
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>
      )}

      {tab === 'about' && !pro.bio && pro.services.length === 0 && links.length === 0 && (
        <Empty text="עדיין אין פרטים נוספים." />
      )}

      {/* Shared by the cover and the portfolio grid. */}
      <PhotoViewer uri={viewing?.media_url ?? null} caption={viewing?.caption} onClose={() => setViewing(null)} />
    </Screen>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.card}>
      <Text muted>{text}</Text>
    </View>
  );
}

type TabKey = 'works' | 'prices' | 'hours' | 'about';

// The parts of her page, one at a time.
const TABS: { key: TabKey; label: string }[] = [
  { key: 'works', label: 'עבודות' },
  { key: 'prices', label: 'מחירון' },
  { key: 'hours', label: 'שעות' },
  { key: 'about', label: 'אודות' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text variant="small" style={styles.tagText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  tabActive: {
    backgroundColor: Colors.ink,
  },
  tabText: {
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.onInk,
  },
  // Her running promotions, in ink so they stand out from the rest of the page.
  promo: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.ink,
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
  promoText: {
    color: Colors.onInk,
  },
  promoMuted: {
    color: Colors.onInkMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  cover: {
    width: '100%',
    height: 220,
    borderRadius: Radius.medium,
    backgroundColor: Colors.placeholder,
  },
  headerCard: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Rides up over the bottom of the cover photo, inset from its sides.
  headerCardOverCover: {
    marginTop: -36,
    marginHorizontal: Spacing.three,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  ratingText: {
    color: Colors.onInk,
  },
  newBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondaryTint,
  },
  newBadgeText: {
    color: Colors.secondaryOnTint,
  },
  section: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photo: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: Radius.small,
    overflow: 'hidden',
    backgroundColor: Colors.placeholder,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  hoursRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  hoursDay: {
    width: 56,
  },
  hoursTimes: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  priceRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  grow: {
    flex: 1,
    gap: 2,
  },
  soon: {
    backgroundColor: Colors.secondaryTint,
    borderColor: Colors.secondaryTint,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentTint,
  },
  tagText: {
    color: Colors.accentOnTint,
  },
  linkButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  linkText: {
    color: Colors.accent,
  },
});
