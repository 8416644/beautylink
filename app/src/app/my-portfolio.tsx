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
import {
  addPhoto,
  fetchPortfolio,
  photoProblem,
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
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    } else {
      // On the web the picker must open straight from the press, so nothing is awaited first.
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: room,
        quality: 0.8,
      });
    }
    if (result.canceled) return;

    const assets = result.assets.slice(0, room);
    const problems: string[] = [];
    if (result.assets.length > room) {
      problems.push(`אפשר עד ${MAX_PHOTOS} תמונות, ולכן הועלו רק ${room} הראשונות.`);
    }
    let sort = items.reduce((max, item) => Math.max(max, item.sort), 0);
    for (const [i, asset] of assets.entries()) {
      setProgress(`מעלים תמונה ${i + 1} מתוך ${assets.length}…`);
      const label = assets.length > 1 ? `תמונה ${i + 1}: ` : '';
      const problem = photoProblem(asset);
      if (problem) {
        problems.push(label + problem);
        continue;
      }
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
    </Screen>
  );
}

function PhotoTile({ item, onChanged }: { item: PortfolioItem; onChanged: () => void }) {
  const [mode, setMode] = useState<'view' | 'caption' | 'delete'>('view');
  const [caption, setCaption] = useState(item.caption ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <Image source={{ uri: item.media_url }} style={styles.photo} contentFit="cover" />
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
