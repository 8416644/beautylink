import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DatePickerModal } from '@/components/date-picker-modal';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  deleteAd,
  fetchAllAds,
  fetchProChoices,
  formatDay,
  parseDay,
  saveAd,
  setAdActive,
  type Ad,
  type AdPicture,
} from '@/lib/ads';
import { useAuth } from '@/lib/auth';
import { fetchCategories, type Category } from '@/lib/categories';
import { today } from '@/lib/dates';
import { fetchFeaturedProId, setFeaturedPro } from '@/lib/featured';
import { fetchPortfolio } from '@/lib/portfolio';
import { photoProblem, pickerOptions } from '@/lib/upload';
import { useAsync } from '@/lib/use-async';

type Pro = { user_id: string; display_name: string };
type Target = 'pro' | 'category' | 'none';

// The admin adds, edits, switches off and removes the ads in the home screen strip.
export default function AdminAdsScreen() {
  const { loading, session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { state, reload } = useAsync(isAdmin ? 'admin-ads' : null, async () => {
    const [ads, pros, categories, featuredId] = await Promise.all([
      fetchAllAds(),
      fetchProChoices(),
      fetchCategories(),
      fetchFeaturedProId(),
    ]);
    return { ads, pros, categories, featuredId };
  });
  const [editing, setEditing] = useState<Ad | 'new' | null>(null);

  if (loading || (session !== null && profile === null)) {
    return (
      <Screen>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <Text variant="title">מודעות</Text>
        <Card>
          <Text>המסך הזה מיועד למנהלי BeautyLink בלבד.</Text>
        </Card>
      </Screen>
    );
  }

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
        <Card>
          <Text muted>לא הצלחנו לטעון את המודעות. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </Card>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const { ads, pros, categories, featuredId } = state.data;

  if (editing !== null) {
    return (
      <AdForm
        ad={editing === 'new' ? null : editing}
        pros={pros}
        categories={categories}
        sort={ads.reduce((max, a) => Math.max(max, a.sort), 0) + 1}
        onDone={(changed) => {
          setEditing(null);
          if (changed) reload();
        }}
      />
    );
  }

  return (
    <Screen>
      <FeaturedPicker pros={pros} featuredId={featuredId} onChanged={reload} />

      <Text variant="title">מודעות</Text>
      <Text muted>
        המודעות מתחלפות בסטריפ שבתחתית מסך הבית. כשאין מודעה פעילה, מופיעות שם ההודעות של
        BeautyLink.
      </Text>
      <Button label="מודעה חדשה" onPress={() => setEditing('new')} />
      {ads.length === 0 ? (
        <Card>
          <Text variant="smallBold">עדיין אין מודעות</Text>
          <Text muted>למשל: מבצע של בעלת מקצוע, או קטגוריה שרוצים לקדם.</Text>
        </Card>
      ) : (
        ads.map((ad) => (
          <AdCard
            key={ad.id}
            ad={ad}
            pros={pros}
            categories={categories}
            onEdit={() => setEditing(ad)}
            onChanged={reload}
          />
        ))
      )}
    </Screen>
  );
}

// Chooses the pro featured on the home screen ("מומלצת השבוע"), or none.
function FeaturedPicker({
  pros,
  featuredId,
  onChanged,
}: {
  pros: Pro[];
  featuredId: string | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(proId: string | null) {
    if (busy || proId === featuredId) return;
    setBusy(true);
    setError(null);
    try {
      await setFeaturedPro(proId);
      onChanged();
    } catch {
      setError('הבחירה לא נשמרה. כדאי לנסות שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text variant="heading">מומלצת השבוע</Text>
      <Text variant="small" muted>
        בעלת המקצוע שתופיע בפס השחור במסך הבית. התמונה נלקחת מתיק העבודות שלה.
      </Text>
      <View style={styles.chips}>
        <Chip label="בלי" selected={featuredId === null} onPress={() => choose(null)} />
        {pros.map((p) => (
          <Chip
            key={p.user_id}
            label={p.display_name}
            selected={featuredId === p.user_id}
            onPress={() => choose(p.user_id)}
          />
        ))}
      </View>
      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function adStatus(ad: Ad) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
  if (!ad.is_active) return 'כבויה';
  if (ad.starts_on && ad.starts_on > today) return `תתחיל ב-${formatDay(ad.starts_on)}`;
  if (ad.ends_on && ad.ends_on < today) return 'הסתיימה';
  return 'מופיעה עכשיו';
}

type CardProps = {
  ad: Ad;
  pros: Pro[];
  categories: Category[];
  onEdit: () => void;
  onChanged: () => void;
};

function AdCard({ ad, pros, categories, onEdit, onChanged }: CardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch {
      setError('הפעולה לא הצליחה. כדאי לנסות שוב.');
      setBusy(false);
    }
  }

  const target = ad.pro_id
    ? `בעלת מקצוע: ${pros.find((p) => p.user_id === ad.pro_id)?.display_name ?? 'לא פעילה'}`
    : ad.category_slug
      ? `קטגוריה: ${categories.find((c) => c.slug === ad.category_slug)?.name ?? ad.category_slug}`
      : 'בלי קישור';
  const dates = [
    ad.starts_on && `מ-${formatDay(ad.starts_on)}`,
    ad.ends_on && `עד ${formatDay(ad.ends_on)}`,
  ].filter(Boolean);

  return (
    <View style={[styles.card, !ad.is_active && styles.off]}>
      <View style={styles.row}>
        {ad.image_url ? (
          <Image source={{ uri: ad.image_url }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.noImage]} />
        )}
        <View style={styles.grow}>
          <Text variant="smallBold">{ad.title}</Text>
          {ad.subtitle ? (
            <Text variant="caption" muted>
              {ad.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <Text variant="caption" muted>
        {[adStatus(ad), target, ...dates].join(' · ')}
      </Text>
      {confirmDelete ? (
        <View style={styles.actions}>
          <Text variant="small">למחוק את המודעה? אי אפשר לבטל את זה.</Text>
          <Button label="כן, למחוק" onPress={() => run(() => deleteAd(ad))} busy={busy} />
          <Button label="ביטול" variant="secondary" onPress={() => setConfirmDelete(false)} />
        </View>
      ) : (
        <View style={styles.chips}>
          <Chip label="עריכה" selected={false} onPress={onEdit} />
          <Chip
            label={ad.is_active ? 'כיבוי' : 'הפעלה'}
            selected={false}
            onPress={() => run(() => setAdActive(ad.id, !ad.is_active))}
          />
          <Chip label="מחיקה" selected={false} onPress={() => setConfirmDelete(true)} />
        </View>
      )}
      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type FormProps = {
  ad: Ad | null;
  pros: Pro[];
  categories: Category[];
  sort: number;
  onDone: (changed: boolean) => void;
};

function AdForm({ ad, pros, categories, sort, onDone }: FormProps) {
  const [title, setTitle] = useState(ad?.title ?? '');
  const [subtitle, setSubtitle] = useState(ad?.subtitle ?? '');
  const [details, setDetails] = useState(ad?.details ?? '');
  const [action, setAction] = useState(ad?.action_label ?? 'לפרטים');
  const [target, setTarget] = useState<Target>(ad?.pro_id ? 'pro' : ad?.category_slug ? 'category' : 'none');
  const [proId, setProId] = useState<string | null>(ad?.pro_id ?? null);
  const [categorySlug, setCategorySlug] = useState<string | null>(ad?.category_slug ?? null);
  const [startsOn, setStartsOn] = useState(ad?.starts_on ? formatDay(ad.starts_on) : '');
  const [endsOn, setEndsOn] = useState(ad?.ends_on ? formatDay(ad.ends_on) : '');
  const [picture, setPicture] = useState<AdPicture>({ kind: 'keep' });
  const [choosingFromPortfolio, setChoosingFromPortfolio] = useState(false);
  const [picking, setPicking] = useState<'starts' | 'ends' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const starts = parseDay(startsOn);
  const ends = parseDay(endsOn);
  const problems = [
    title.trim() === '' && 'כותרת',
    title.trim().length > 60 && 'כותרת עד 60 תווים',
    subtitle.trim().length > 90 && 'טקסט עד 90 תווים',
    details.trim().length > 1000 && 'פרטים נוספים עד 1,000 תווים',
    (action.trim() === '' || action.trim().length > 16) && 'טקסט הכפתור (עד 16 תווים)',
    target === 'pro' && proId === null && 'לאיזו בעלת מקצוע',
    target === 'category' && categorySlug === null && 'לאיזו קטגוריה',
    starts === undefined && 'מתאריך (למשל 1.12.2026)',
    ends === undefined && 'עד תאריך (למשל 31.12.2026)',
    starts && ends && ends < starts && 'תאריך הסיום לפני תאריך ההתחלה',
  ].filter((p): p is string => typeof p === 'string');

  async function pick() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (result.canceled) return;
    const asset = result.assets[0];
    const problem = photoProblem(asset);
    if (problem) return setError(problem);
    setPicture({ kind: 'upload', asset });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await saveAd(
        {
          title: title.trim(),
          subtitle: subtitle.trim(),
          details: details.trim(),
          action_label: action.trim(),
          pro_id: target === 'pro' ? proId : null,
          category_slug: target === 'category' ? categorySlug : null,
          starts_on: starts ?? null,
          ends_on: ends ?? null,
          is_active: ad?.is_active ?? true,
        },
        ad,
        picture,
        sort,
      );
      onDone(true);
    } catch {
      setError('לא הצלחנו לשמור. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.');
      setBusy(false);
    }
  }

  const shownImage =
    picture.kind === 'upload'
      ? picture.asset.uri
      : picture.kind === 'portfolio'
        ? picture.url
        : picture.kind === 'none'
          ? null
          : (ad?.image_url ?? null);

  return (
    <Screen>
      <Text variant="title">{ad ? 'עריכת מודעה' : 'מודעה חדשה'}</Text>

      <TextField label="כותרת" value={title} onChangeText={setTitle} hint="למשל: סטודיו שרה · ציפורניים" />
      <TextField
        label="טקסט (לא חובה)"
        value={subtitle}
        onChangeText={setSubtitle}
        hint="למשל: 20% הנחה על לק ג'ל השבוע"
      />
      <TextField
        label="פרטים נוספים (לא חובה)"
        value={details}
        onChangeText={setDetails}
        multiline
        hint={`מה כלול, מה לא כלול ותנאים. מופיע במסך המבצע, בכפתור "פרטים נוספים". ${details.trim().length}/1000`}
      />

      <View style={styles.section}>
        <Text variant="smallBold">תמונה (לא חובה)</Text>
        <Text variant="caption" muted>
          תמונה צנועה בלבד: חפצים, ידיים או פנים. בלי תמונה יופיע הלוגו.
        </Text>
        <View style={styles.row}>
          {shownImage ? (
            <Image source={{ uri: shownImage }} style={styles.preview} contentFit="cover" />
          ) : (
            <View style={[styles.preview, styles.noImage]} />
          )}
          <View style={[styles.grow, styles.actions]}>
            <Button label="מהגלריה" variant="secondary" onPress={pick} />
            <Button
              label="מתיק עבודות"
              variant="secondary"
              onPress={() => setChoosingFromPortfolio(true)}
            />
            {shownImage ? (
              <Button label="בלי תמונה" variant="secondary" onPress={() => setPicture({ kind: 'none' })} />
            ) : null}
          </View>
        </View>
      </View>
      <PortfolioPicker
        visible={choosingFromPortfolio}
        pros={pros}
        initialProId={target === 'pro' ? proId : null}
        onPick={(url) => setPicture({ kind: 'portfolio', url })}
        onClose={() => setChoosingFromPortfolio(false)}
      />

      <View style={styles.section}>
        <Text variant="smallBold">לחיצה על המודעה מובילה ל:</Text>
        <View style={styles.chips}>
          <Chip label="בעלת מקצוע" selected={target === 'pro'} onPress={() => setTarget('pro')} />
          <Chip label="קטגוריה" selected={target === 'category'} onPress={() => setTarget('category')} />
          <Chip label="בלי קישור" selected={target === 'none'} onPress={() => setTarget('none')} />
        </View>
        {target === 'pro' && (
          <View style={styles.chips}>
            {pros.length === 0 ? (
              <Text variant="small" muted>
                עדיין אין בעלות מקצוע מאושרות.
              </Text>
            ) : (
              pros.map((p) => (
                <Chip
                  key={p.user_id}
                  label={p.display_name}
                  selected={proId === p.user_id}
                  onPress={() => setProId(p.user_id)}
                />
              ))
            )}
          </View>
        )}
        {target === 'category' && (
          <View style={styles.chips}>
            {categories.map((c) => (
              <Chip
                key={c.slug}
                label={c.name}
                selected={categorySlug === c.slug}
                onPress={() => setCategorySlug(c.slug)}
              />
            ))}
          </View>
        )}
        {target !== 'none' && (
          <TextField label="הכיתוב על הכפתור" value={action} onChangeText={setAction} hint="למשל: לפרטים, להזמנה" />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="smallBold">מתי המודעה מופיעה (לא חובה)</Text>
        <View style={styles.row}>
          <View style={[styles.grow, styles.actions]}>
            <TextField label="מתאריך" ltr value={startsOn} onChangeText={setStartsOn} placeholder="1.12.2026" />
            <Chip label="בחירה מלוח השנה" selected={false} onPress={() => setPicking('starts')} />
          </View>
          <View style={[styles.grow, styles.actions]}>
            <TextField label="עד תאריך" ltr value={endsOn} onChangeText={setEndsOn} placeholder="31.12.2026" />
            <Chip label="בחירה מלוח השנה" selected={false} onPress={() => setPicking('ends')} />
          </View>
        </View>
        <DatePickerModal
          visible={picking !== null}
          title={picking === 'ends' ? 'עד איזה תאריך?' : 'מאיזה תאריך?'}
          value={(picking === 'ends' ? ends : starts) || null}
          // No days in the past, and the end cannot come before the start.
          minDay={picking === 'ends' && starts && starts > today() ? starts : today()}
          onPick={(day) => (picking === 'ends' ? setEndsOn : setStartsOn)(formatDay(day))}
          onClear={() => (picking === 'ends' ? setEndsOn : setStartsOn)('')}
          onClose={() => setPicking(null)}
        />
        <Text variant="caption" muted>
          בלי תאריכים, המודעה מופיעה עד שמכבים אותה.
        </Text>
      </View>

      {problems.length > 0 && (
        <Text variant="small" muted>
          חסר: {problems.join(', ')}
        </Text>
      )}
      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="שמירה" onPress={submit} disabled={problems.length > 0} busy={busy} />
      <Button label="ביטול" variant="secondary" onPress={() => onDone(false)} />
    </Screen>
  );
}

type PortfolioPickerProps = {
  visible: boolean;
  pros: Pro[];
  initialProId: string | null;
  onPick: (url: string) => void;
  onClose: () => void;
};

// A window with the portfolio photos of the pro chosen at its top, to use one in the ad.
function PortfolioPicker({ visible, pros, initialProId, onPick, onClose }: PortfolioPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {visible && <PortfolioPickerWindow pros={pros} initialProId={initialProId} onPick={onPick} onClose={onClose} />}
    </Modal>
  );
}

function PortfolioPickerWindow({ pros, initialProId, onPick, onClose }: Omit<PortfolioPickerProps, 'visible'>) {
  const [proId, setProId] = useState<string | null>(initialProId ?? pros[0]?.user_id ?? null);
  const { state, reload } = useAsync(proId, () => fetchPortfolio(proId!));

  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגירה">
      {/* Taps inside the window do not close it. */}
      <Pressable style={styles.window} onPress={() => {}}>
        <Text variant="heading">תמונה מתיק עבודות</Text>
        {pros.length === 0 ? (
          <Text muted>עדיין אין בעלות מקצוע מאושרות.</Text>
        ) : (
          <>
            <View style={styles.chips}>
              {pros.map((p) => (
                <Chip
                  key={p.user_id}
                  label={p.display_name}
                  selected={proId === p.user_id}
                  onPress={() => setProId(p.user_id)}
                />
              ))}
            </View>
            <ScrollView style={styles.photosScroll} contentContainerStyle={styles.photos}>
              {state.status === 'loading' ? (
                <Text muted>טוענים…</Text>
              ) : state.status === 'error' ? (
                <View style={styles.actions}>
                  <Text muted>לא הצלחנו לטעון את התמונות.</Text>
                  <Button label="לנסות שוב" variant="secondary" onPress={reload} />
                </View>
              ) : state.data.length === 0 ? (
                <Text muted>אין עדיין תמונות בתיק העבודות שלה.</Text>
              ) : (
                state.data.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.photoCell}
                    onPress={() => {
                      onPick(item.media_url);
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.caption ?? 'תמונה מתיק העבודות'}>
                    <Image source={{ uri: item.media_url }} style={styles.photo} contentFit="cover" />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </>
        )}
        <Button label="ביטול" variant="secondary" onPress={onClose} />
      </Pressable>
    </Pressable>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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
  off: {
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.small,
  },
  preview: {
    width: 88,
    height: 88,
    borderRadius: Radius.small,
  },
  noImage: {
    backgroundColor: Colors.placeholder,
  },
  section: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
  error: {
    color: Colors.accentPressed,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(26, 20, 22, 0.45)',
  },
  window: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.background,
  },
  photosScroll: {
    flexGrow: 0,
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photoCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: Radius.small,
    overflow: 'hidden',
    backgroundColor: Colors.placeholder,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});
