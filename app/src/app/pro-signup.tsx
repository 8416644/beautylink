import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchCategories, type Category } from '@/lib/categories';
import {
  fetchOwnProProfile,
  fetchSubcategories,
  saveProCover,
  saveProProfile,
  type OwnProProfile,
  type Subcategory,
} from '@/lib/pro-account';
import { normalizeLink } from '@/lib/links';
import { photoProblem, pickerOptions } from '@/lib/upload';
import { useAsync } from '@/lib/use-async';

export default function ProSignupScreen() {
  const { loading, session } = useAuth();
  const userId = session?.user.id ?? null;

  const { state, reload } = useAsync(userId, async () => {
    const [existing, categories, subcategories] = await Promise.all([
      fetchOwnProProfile(userId!),
      fetchCategories(),
      fetchSubcategories(),
    ]);
    return { existing, categories, subcategories };
  });

  if (loading) return <Screen>{null}</Screen>;

  if (!userId) {
    return (
      <Screen>
        <Text variant="title">הצטרפות כבעלת מקצוע</Text>
        <Card>
          <Text>כדי להצטרף כבעלת מקצוע צריך קודם להתחבר או ליצור חשבון.</Text>
        </Card>
        <Button label="התחברות או הרשמה" onPress={() => router.push('/sign-in')} />
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
          <Text muted>לא הצלחנו לטעון את הפרטים. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </Card>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const { existing, categories, subcategories } = state.data;
  return (
    <ProForm
      userId={userId}
      existing={existing}
      categories={categories}
      subcategories={subcategories}
    />
  );
}

type ProFormProps = {
  userId: string;
  existing: OwnProProfile | null;
  categories: Category[];
  subcategories: Subcategory[];
};

function ProForm({ userId, existing, categories, subcategories }: ProFormProps) {
  const [displayName, setDisplayName] = useState(existing?.display_name ?? '');
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [years, setYears] = useState(existing?.years_experience?.toString() ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [showAddress, setShowAddress] = useState(existing?.show_address ?? false);
  const [neighborhood, setNeighborhood] = useState(existing?.neighborhood ?? '');
  const [salon, setSalon] = useState(existing?.works_at_salon ?? false);
  const [home, setHome] = useState(existing?.works_at_home ?? false);
  const [travels, setTravels] = useState(existing?.travels_to_client ?? false);
  const [radius, setRadius] = useState(existing?.travel_radius_km?.toString() ?? '');
  const [instagram, setInstagram] = useState(existing?.instagram_url ?? '');
  const [tiktok, setTiktok] = useState(existing?.tiktok_url ?? '');
  const [facebook, setFacebook] = useState(existing?.facebook_url ?? '');
  const [selected, setSelected] = useState<number[]>(existing?.subcategory_ids ?? []);
  const [status, setStatus] = useState(existing?.status ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // A new or removed profile photo, saved with the rest of the form.
  const [coverChange, setCoverChange] = useState<
    { kind: 'upload'; asset: ImagePicker.ImagePickerAsset } | { kind: 'none' } | null
  >(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverUri =
    coverChange?.kind === 'upload'
      ? coverChange.asset.uri
      : coverChange?.kind === 'none'
        ? null
        : (existing?.cover_url ?? null);

  async function pickCover(source: 'library' | 'camera') {
    setCoverError(null);
    if (source === 'camera' && Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return setCoverError('כדי לצלם צריך לאשר גישה למצלמה בהגדרות הטלפון.');
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (result.canceled) return;
    const asset = result.assets[0];
    const problem = photoProblem(asset);
    if (problem) return setCoverError(problem);
    setCoverChange({ kind: 'upload', asset });
  }

  if (status === 'suspended') {
    return (
      <Screen>
        <Text variant="title">הפרופיל המקצועי</Text>
        <Card>
          <Text>הפרופיל המקצועי שלך מושהה כרגע. לפרטים אפשר לפנות לצוות BeautyLink.</Text>
        </Card>
      </Screen>
    );
  }

  if (saved) {
    return (
      <Screen>
        <Text variant="title">{status === 'approved' ? 'הפרטים נשמרו' : 'הבקשה נשלחה'}</Text>
        <Card>
          <Text>
            {status === 'approved'
              ? 'השינויים בפרופיל המקצועי שלך נשמרו.'
              : 'תודה! צוות BeautyLink יעבור על הפרטים, ונעדכן אותך כשהפרופיל יאושר.'}
          </Text>
        </Card>
        <Button label="חזרה לפרופיל" onPress={() => router.replace('/profile')} />
      </Screen>
    );
  }

  const yearsNumber = years.trim() === '' ? null : Number(years);
  const radiusNumber = radius.trim() === '' ? null : Number(radius);
  const problems = [
    displayName.trim() === '' && 'שם העסק או השם המקצועי',
    city.trim() === '' && 'עיר',
    !(salon || home || travels) && 'איפה את עובדת',
    selected.length === 0 && 'לפחות שירות אחד',
    yearsNumber !== null &&
      !(Number.isInteger(yearsNumber) && yearsNumber >= 0 && yearsNumber <= 80) &&
      'שנות ניסיון (מספר בין 0 ל-80)',
    travels &&
      !(radiusNumber !== null && Number.isInteger(radiusNumber) && radiusNumber >= 1 && radiusNumber <= 100) &&
      'מרחק הגעה (מספר בין 1 ל-100)',
  ].filter((p): p is string => typeof p === 'string');

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await saveProProfile(
        userId,
        {
          display_name: displayName.trim(),
          bio: bio.trim(),
          years_experience: yearsNumber,
          city: city.trim(),
          neighborhood: neighborhood.trim() || null,
          address: address.trim() || null,
          show_address: showAddress && address.trim() !== '',
          works_at_salon: salon,
          works_at_home: home,
          travels_to_client: travels,
          travel_radius_km: travels ? radiusNumber : null,
          instagram_url: normalizeLink(instagram),
          tiktok_url: normalizeLink(tiktok),
          facebook_url: normalizeLink(facebook),
        },
        selected,
        status,
      );
      // After the profile, so a new pro's row exists before her photo goes to her folder.
      if (coverChange) await saveProCover(userId, coverChange, existing?.cover_url ?? null);
      if (status !== 'approved' && status !== 'pending') setStatus('pending');
      setSaved(true);
    } catch {
      setError('לא הצלחנו לשמור. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="title">
        {status === null ? 'הצטרפות כבעלת מקצוע' : 'הפרופיל המקצועי שלי'}
      </Text>

      {status === null && (
        <Text muted>ממלאים פרטים, וצוות BeautyLink מאשר את הפרופיל לפני שהוא מופיע בחיפוש.</Text>
      )}
      {status === 'pending' && (
        <Notice tone="lavender" text="הבקשה שלך ממתינה לאישור. אפשר לעדכן פרטים בינתיים." />
      )}
      {status === 'approved' && <Notice tone="lavender" text="הפרופיל שלך מאושר ומופיע בחיפוש." />}
      {status === 'rejected' && (
        <Notice
          tone="rose"
          text={`הבקשה לא אושרה${
            existing?.rejection_reason ? `: ${existing.rejection_reason}` : '.'
          } אפשר לתקן את הפרטים ולשלוח שוב.`}
        />
      )}

      <Section title="תמונת פרופיל">
        <Text variant="small" muted>
          מופיעה בגדול בראש הדף שלך. אפשר לוגו של העסק, הסלון או עבודה שלך. תמונה צנועה בלבד.
        </Text>
        <View style={styles.coverRow}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverEmpty]} />
          )}
          <View style={styles.coverActions}>
            <Button label="מהגלריה" variant="secondary" onPress={() => pickCover('library')} />
            <Button label="צילום" variant="secondary" onPress={() => pickCover('camera')} />
            {coverUri ? (
              <Button label="הסרה" variant="secondary" onPress={() => setCoverChange({ kind: 'none' })} />
            ) : null}
          </View>
        </View>
        {coverError ? (
          <Text variant="small" style={styles.error} accessibilityRole="alert">
            {coverError}
          </Text>
        ) : null}
      </Section>

      <Section title="פרטי העסק">
        <TextField label="שם העסק או השם המקצועי" value={displayName} onChangeText={setDisplayName} />
        <TextField
          label="קצת עלייך"
          value={bio}
          onChangeText={setBio}
          multiline
          hint="מה את אוהבת לעשות, במה את מתמחה, מה מיוחד אצלך"
        />
        <TextField
          label="שנות ניסיון"
          value={years}
          onChangeText={setYears}
          keyboardType="number-pad"
        />
        <TextField
          label="אינסטגרם"
          ltr
          value={instagram}
          onChangeText={setInstagram}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://instagram.com/..."
        />
        <TextField
          label="טיקטוק"
          ltr
          value={tiktok}
          onChangeText={setTiktok}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://tiktok.com/@..."
        />
        <TextField
          label="פייסבוק"
          ltr
          value={facebook}
          onChangeText={setFacebook}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://facebook.com/..."
        />
      </Section>

      <Section title="מיקום">
        <TextField label="עיר" value={city} onChangeText={setCity} />
        <TextField label="שכונה" value={neighborhood} onChangeText={setNeighborhood} />
        <TextField
          label="הכתובת המלאה (לא חובה)"
          value={address}
          onChangeText={setAddress}
          hint="רחוב ומספר, למשל: הרב קוק 12. משמשת לניווט בוויז."
        />
        {address.trim() !== '' && (
          <View style={styles.group}>
            <Text variant="smallBold">מי רואה את הכתובת?</Text>
            <View style={styles.chips}>
              <Chip
                label="רק לקוחות עם תור מאושר"
                selected={!showAddress}
                onPress={() => setShowAddress(false)}
              />
              <Chip label="כולם, בדף שלי" selected={showAddress} onPress={() => setShowAddress(true)} />
            </View>
            <Text variant="caption" muted>
              {showAddress
                ? 'הכתובת וכפתור הניווט בוויז יופיעו בדף שלך לכל מי שנכנסת. מתאים לסלון או סטודיו.'
                : 'הכתובת וכפתור הניווט יופיעו רק ללקוחה שהתור שלה אושר, ב"התורים שלי". מומלץ כשעובדים מהבית.'}
            </Text>
          </View>
        )}
        <Text variant="smallBold">איפה את עובדת?</Text>
        <View style={styles.chips}>
          <Chip label="בסלון" selected={salon} onPress={() => setSalon(!salon)} />
          <Chip label="בבית שלי" selected={home} onPress={() => setHome(!home)} />
          <Chip label="מגיעה ללקוחה" selected={travels} onPress={() => setTravels(!travels)} />
        </View>
        {travels && (
          <TextField
            label="עד כמה קילומטרים את מגיעה?"
            value={radius}
            onChangeText={setRadius}
            keyboardType="number-pad"
          />
        )}
      </Section>

      <Section title="שירותים">
        <Text variant="small" muted>
          מסמנים את כל מה שאת עושה. כך לקוחות ימצאו אותך בחיפוש.
        </Text>
        {categories.map((category) => {
          const subs = subcategories.filter((s) => s.category_id === category.id);
          if (subs.length === 0) return null;
          return (
            <View key={category.id} style={styles.group}>
              <Text variant="smallBold">{category.name}</Text>
              <View style={styles.chips}>
                {subs.map((sub) => (
                  <Chip
                    key={sub.id}
                    label={sub.name}
                    selected={selected.includes(sub.id)}
                    onPress={() => toggle(sub.id)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </Section>

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
      <Button
        label={status === 'approved' || status === 'pending' ? 'שמירה' : 'שליחה לאישור'}
        onPress={submit}
        disabled={problems.length > 0}
        busy={busy}
      />
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

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Notice({ tone, text }: { tone: 'rose' | 'lavender'; text: string }) {
  const rose = tone === 'rose';
  return (
    <View style={[styles.notice, { backgroundColor: rose ? Colors.accentTint : Colors.secondaryTint }]}>
      <Text variant="small" style={{ color: rose ? Colors.accentOnTint : Colors.secondaryOnTint }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cover: {
    width: 120,
    height: 120,
    borderRadius: Radius.medium,
  },
  coverEmpty: {
    backgroundColor: Colors.placeholder,
  },
  coverActions: {
    flex: 1,
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Radius.small,
  },
  error: {
    color: Colors.accentPressed,
  },
});
