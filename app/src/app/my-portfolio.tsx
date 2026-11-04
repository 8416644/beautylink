import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { PhotoViewer } from '@/components/photo-viewer';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  addPhoto,
  fetchPortfolio,
  photoProblem,
  pickerOptions,
  removePhoto,
  updateCaption,
  type PortfolioItem,
} from '@/lib/portfolio';
import { fetchOwnProProfile } from '@/lib/pro-account';
import { useAsync } from '@/lib/use-async';

const MAX_PHOTOS = 30;

// Where a pro adds photos of her work; clients see them on her page.
export default function MyPortfolioScreen() {
  const { loading, session } = useAuth();
  const userId = session?.user.id ?? null;

  const { state, reload } = useAsync(userId, async () => {
    const [pro, items] = await Promise.all([fetchOwnProProfile(userId!), fetchPortfolio(userId!)]);
    return { pro, items };
  });

  if (loading) return <Screen>{null}</Screen>;

  if (!userId) {
    return (
      <Screen>
        <Text variant="title">תיק העבודות שלי</Text>
        <Card>
          <Text>כדי לנהל את תיק העבודות צריך קודם להתחבר.</Text>
        </Card>
        <Button label="התחברות" onPress={() => router.push('/sign-in')} />
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
          <Text muted>לא הצלחנו לטעון את תיק העבודות. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </Card>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const { pro, items } = state.data;

  if (!pro) {
    return (
      <Screen>
        <Text variant="title">תיק העבודות שלי</Text>
        <Card>
          <Text>קודם מצטרפים כבעלת מקצוע, ואחר כך מוסיפים תמונות של עבודות.</Text>
        </Card>
        <Button label="הצטרפות כבעלת מקצוע" onPress={() => router.replace('/pro-signup')} />
      </Screen>
    );
  }

  if (pro.status === 'suspended') {
    return (
      <Screen>
        <Text variant="title">תיק העבודות שלי</Text>
        <Card>
          <Text>הפרופיל המקצועי שלך מושהה כרגע. לפרטים אפשר לפנות לצוות BeautyLink.</Text>
        </Card>
      </Screen>
    );
  }

  return <PortfolioEditor proId={userId} items={items} onChanged={reload} />;
}

function PortfolioEditor({
  proId,
  items,
  onChanged,
}: {
  proId: string;
  items: PortfolioItem[];
  onChanged: () => void;
}) {
  const [progress, setProgress] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  // Picked photos waiting for her to look them over and approve the upload.
  const [pending, setPending] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);
  const room = MAX_PHOTOS - items.length;

  async function pick(source: 'library' | 'camera') {
    setMessages([]);
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      // On the web the camera must open straight from the press, and the browser asks
      // for access itself; a phone needs the app's permission first.
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setMessages(['כדי לצלם צריך לאשר גישה למצלמה בהגדרות הטלפון.']);
          return;
        }
      }
      result = await ImagePicker.launchCameraAsync(pickerOptions);
    } else {
      // On the web the picker must open straight from the press, so nothing is awaited first.
      result = await ImagePicker.launchImageLibraryAsync({
        ...pickerOptions,
        allowsMultipleSelection: true,
        selectionLimit: room,
      });
    }
    if (result.canceled) return;

    // Photos that cannot be uploaded are reported now, before she reviews the rest.
    const problems: string[] = [];
    const picked = result.assets.filter((asset, i) => {
      const problem = photoProblem(asset);
      if (problem) problems.push((result.assets.length > 1 ? `תמונה ${i + 1}: ` : '') + problem);
      return problem === null;
    });
    if (picked.length > room) {
      problems.push(`אפשר עד ${MAX_PHOTOS} תמונות, ולכן נבחרו רק ${room} הראשונות.`);
    }
    setMessages(problems);
    setPending(picked.slice(0, room));
  }

  async function upload() {
    const assets = pending;
    setPending([]);
    const problems: string[] = [];
    let sort = items.reduce((max, item) => Math.max(max, item.sort), 0);
    for (const [i, asset] of assets.entries()) {
      setProgress(`מעלים תמונה ${i + 1} מתוך ${assets.length}…`);
      const label = assets.length > 1 ? `תמונה ${i + 1}: ` : '';
      try {
        sort += 1;
        await addPhoto(proId, asset, sort);
      } catch {
        problems.push(label + 'ההעלאה לא הצליחה. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.');
      }
    }
    setProgress(null);
    setMessages(problems);
    onChanged();
  }

  return (
    <Screen>
      <Text variant="title">תיק העבודות שלי</Text>
      <Text muted>תמונות של עבודות שעשית. לקוחות יראו אותן בדף שלך.</Text>

      {progress ? (
        <Card>
          <Text>{progress}</Text>
        </Card>
      ) : pending.length > 0 ? (
        <View style={styles.review}>
          <Text variant="heading">בדיקה לפני העלאה</Text>
          <Text variant="small" muted>
            לוחצים על תמונה כדי לראות אותה בגדול ולהגדיל. מה שלא מתאים אפשר להסיר.
          </Text>
          <View style={styles.grid}>
            {pending.map((asset) => (
              <View key={asset.uri} style={styles.tile}>
                <Pressable onPress={() => setViewing(asset.uri)} accessibilityRole="button" accessibilityLabel="הצגה בגדול">
                  <Image source={{ uri: asset.uri }} style={styles.photo} contentFit="cover" />
                </Pressable>
                <Chip
                  label="הסרה"
                  selected={false}
                  onPress={() => setPending((p) => p.filter((a) => a.uri !== asset.uri))}
                />
              </View>
            ))}
          </View>
          <Button
            label={pending.length === 1 ? 'אישור והעלאה' : `אישור והעלאה של ${pending.length} תמונות`}
            onPress={upload}
          />
          <Button label="ביטול" variant="secondary" onPress={() => setPending([])} />
        </View>
      ) : room > 0 ? (
        <View style={styles.actions}>
          <Button label="הוספת תמונות מהגלריה" onPress={() => pick('library')} />
          <Button label="צילום תמונה" variant="secondary" onPress={() => pick('camera')} />
        </View>
      ) : (
        <Text variant="small" muted>
          הגעת למקסימום של {MAX_PHOTOS} תמונות. כדי להוסיף, צריך קודם למחוק תמונה.
        </Text>
      )}

      {messages.map((message) => (
        <Text key={message} variant="small" style={styles.error} accessibilityRole="alert">
          {message}
        </Text>
      ))}

      {items.length === 0 ? (
        <Card>
          <Text variant="smallBold">עדיין אין תמונות</Text>
          <Text muted>כדאי להעלות כמה מהעבודות הכי יפות שלך, באור טוב ובחדות.</Text>
        </Card>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <PhotoTile key={item.id} item={item} onChanged={onChanged} />
          ))}
        </View>
      )}

      <PhotoViewer
        uri={viewing}
        onClose={() => setViewing(null)}
        footer={
          <>
            <Button label="נראית טוב" onPress={() => setViewing(null)} />
            <Button
              label="הסרה מההעלאה"
              variant="secondary"
              onPress={() => {
                setPending((p) => p.filter((a) => a.uri !== viewing));
                setViewing(null);
              }}
            />
          </>
        }
      />
    </Screen>
  );
}

function PhotoTile({ item, onChanged }: { item: PortfolioItem; onChanged: () => void }) {
  const [mode, setMode] = useState<'view' | 'caption' | 'delete'>('view');
  const [caption, setCaption] = useState(item.caption ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setMode('view');
      onChanged();
    } catch {
      setError('הפעולה לא הצליחה. כדאי לנסות שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.tile}>
      <Pressable onPress={() => setEnlarged(true)} accessibilityRole="button" accessibilityLabel="הצגה בגדול">
        <Image source={{ uri: item.media_url }} style={styles.photo} contentFit="cover" />
      </Pressable>
      <PhotoViewer
        uri={enlarged ? item.media_url : null}
        caption={item.caption}
        onClose={() => setEnlarged(false)}
      />
      {mode === 'caption' ? (
        <View style={styles.actions}>
          <TextField label="תיאור קצר" value={caption} onChangeText={setCaption} />
          <Button label="שמירה" onPress={() => run(() => updateCaption(item.id, caption))} busy={busy} />
          <Button label="ביטול" variant="secondary" onPress={() => setMode('view')} />
        </View>
      ) : mode === 'delete' ? (
        <View style={styles.actions}>
          <Text variant="small">למחוק את התמונה? אי אפשר לבטל את זה.</Text>
          <Button label="כן, למחוק" onPress={() => run(() => removePhoto(item))} busy={busy} />
          <Button label="ביטול" variant="secondary" onPress={() => setMode('view')} />
        </View>
      ) : (
        <>
          {item.is_hidden ? (
            <Text variant="caption" style={styles.hiddenNote}>
              הוסתרה על ידי צוות BeautyLink ולא מופיעה ללקוחות. אפשר למחוק אותה.
            </Text>
          ) : null}
          {item.caption ? <Text variant="small">{item.caption}</Text> : null}
          <View style={styles.chips}>
            <Chip label={item.caption ? 'עריכת תיאור' : 'הוספת תיאור'} selected={false} onPress={() => setMode('caption')} />
            <Chip label="מחיקה" selected={false} onPress={() => setMode('delete')} />
          </View>
        </>
      )}
      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  hiddenNote: {
    color: Colors.accentPressed,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  review: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.secondaryTint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tile: {
    width: '47%',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.small,
    backgroundColor: Colors.placeholder,
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
});
