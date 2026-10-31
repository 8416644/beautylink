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
    const [pro, priceList, photos, hours] = await Promise.all([
      fetchPublicPro(id!),
      fetchActiveServices(id!),
      fetchPortfolio(id!),
      fetchWorkingHours(id!),
    ]);
    return pro ? { pro, priceList, photos, hours } : null;
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

  const { pro, priceList, photos, hours } = state.data;
  return <ProPage pro={pro} priceList={priceList} photos={photos} hours={hours} />;
}

type ProPageProps = {
  pro: PublicPro;
  priceList: Service[];
  photos: PortfolioItem[];
  hours: Shift[];
};

function ProPage({ pro, priceList, photos, hours }: ProPageProps) {
  const [viewing, setViewing] = useState<PortfolioItem | null>(null);
  const place = [pro.neighborhood, pro.city].filter(Boolean).join(', ');
  const where = [
    pro.works_at_salon && 'בסלון',
    pro.works_at_home && 'בבית שלה',
    pro.travels_to_client &&
      `מגיעה אלייך${pro.travel_radius_km ? ` (עד ${pro.travel_radius_km} ק"מ)` : ''}`,
  ].filter((w): w is string => typeof w === 'string');
  const travelFee = Number(pro.travel_fee_ils);
  const links = [
    { label: 'אינסטגרם', url: pro.instagram_url },
    { label: 'טיקטוק', url: pro.tiktok_url },
    { label: 'פייסבוק', url: pro.facebook_url },
  ].filter((l): l is { label: string; url: string } => isWebLink(l.url));

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" style={styles.name}>
          {pro.display_name}
        </Text>
        {pro.rating_count > 0 ? (
          <View style={styles.rating}>
            <Icon name={{ ios: 'star.fill', android: 'star', web: 'star' }} size={18} color={Colors.star} />
            <Text variant="smallBold">{Number(pro.rating_avg).toFixed(1)}</Text>
            <Text variant="small" muted>
              ({pro.rating_count} ביקורות)
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
      <Text muted>
        {place}
        {pro.years_experience !== null ? ` · ${pro.years_experience} שנות ניסיון` : ''}
      </Text>

      {pro.bio ? (
        <View style={styles.card}>
          <Text>{pro.bio}</Text>
        </View>
      ) : null}

      <Section title="איפה היא עובדת">
        <View style={styles.tags}>
          {where.map((label) => (
            <Tag key={label} label={label} />
          ))}
        </View>
        {pro.travels_to_client && travelFee > 0 ? (
          <Text variant="small" muted>
            תוספת הגעה: {travelFee} ₪
          </Text>
        ) : null}
      </Section>

      {photos.length > 0 && (
        <Section title="תיק עבודות">
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
          <PhotoViewer
            uri={viewing?.media_url ?? null}
            caption={viewing?.caption}
            onClose={() => setViewing(null)}
          />
        </Section>
      )}

      {priceList.length > 0 && (
        <Section title="מחירון">
          <View style={styles.card}>
            {priceList.map((service, i) => (
              <View key={service.id} style={[styles.priceRow, i > 0 && styles.priceRowBorder]}>
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
              </View>
            ))}
          </View>
        </Section>
      )}

      {hours.length > 0 && (
        <Section title="שעות פעילות">
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
        </Section>
      )}

      {pro.services.length > 0 && (
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

      {links.length > 0 && (
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

      <View style={[styles.card, styles.soon]}>
        <Text variant="smallBold">בקרוב</Text>
        <Text variant="small" muted>
          ביקורות וקביעת תור ישירות מהאפליקציה.
        </Text>
      </View>
    </Screen>
  );
}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
