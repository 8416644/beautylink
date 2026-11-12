import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { LikeButton } from '@/components/like-button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  addComment,
  deleteComment,
  fetchComments,
  fetchPhoto,
  loadMyLikes,
  MAX_COMMENT_LENGTH,
  type PhotoComment,
} from '@/lib/photo-social';
import { useAsync } from '@/lib/use-async';

// A portfolio photo with its likes and comments. Anyone can read; signed-in users like and
// comment. The writer, the pro who owns the photo and the admin can delete a comment.
export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const userId = session?.user.id ?? null;
  const { state: photoState } = useAsync(id ?? null, () => fetchPhoto(id!));
  const { state: commentsState, reload } = useAsync(id ? `comments:${id}` : null, () => fetchComments(id!));

  useEffect(() => {
    if (userId && id) loadMyLikes([id]);
  }, [userId, id]);

  if (photoState.status === 'loading') {
    return (
      <Screen inTabs={false}>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }
  if (photoState.status === 'error' || photoState.data === null) {
    return (
      <Screen inTabs={false}>
        <View style={styles.card}>
          <Text muted>
            {photoState.status === 'error'
              ? 'לא הצלחנו לטעון את התמונה. כדאי לבדוק את החיבור לאינטרנט.'
              : 'התמונה הזו כבר לא זמינה.'}
          </Text>
        </View>
      </Screen>
    );
  }

  const photo = photoState.data;
  const comments = commentsState.status === 'ready' ? commentsState.data : [];
  const canDelete = (c: PhotoComment) =>
    c.user_id === userId || photo.pro_id === userId || profile?.role === 'admin';

  return (
    <Screen inTabs={false}>
      <Image source={{ uri: photo.media_url }} style={styles.photo} contentFit="cover" />
      <View style={styles.row}>
        <Pressable
          style={styles.grow}
          onPress={() => router.push({ pathname: '/pro/[id]', params: { id: photo.pro_id } })}
          accessibilityRole="link">
          <Text variant="smallBold" style={styles.link}>
            {photo.pro_name}
          </Text>
        </Pressable>
        <LikeButton photoId={photo.id} count={photo.like_count} />
      </View>
      {photo.caption ? <Text>{photo.caption}</Text> : null}

      <View style={styles.section}>
        <Text variant="heading">תגובות</Text>
        {commentsState.status === 'loading' ? (
          <Text muted>טוענים…</Text>
        ) : comments.length === 0 ? (
          <Text muted>עוד אין תגובות. אפשר להיות הראשונה.</Text>
        ) : (
          comments.map((c) => (
            <CommentRow key={c.id} comment={c} canDelete={canDelete(c)} onDeleted={reload} />
          ))
        )}
      </View>

      {userId ? (
        <NewComment userId={userId} photoId={photo.id} onAdded={reload} />
      ) : (
        <Button label="מתחברים כדי להגיב" variant="secondary" onPress={() => router.push('/sign-in')} />
      )}
    </Screen>
  );
}

function CommentRow({
  comment,
  canDelete,
  onDeleted,
}: {
  comment: PhotoComment;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const day = new Date(comment.created_at).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });

  async function remove() {
    setBusy(true);
    try {
      await deleteComment(comment.id);
      onDeleted();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <View style={styles.comment}>
      <View style={styles.row}>
        <Text variant="smallBold" style={styles.grow}>
          {comment.author_name || 'משתמשת'}
        </Text>
        <Text variant="caption" muted>
          {day}
        </Text>
      </View>
      <Text>{comment.body}</Text>
      {canDelete &&
        (confirming ? (
          <View style={styles.row}>
            <Text variant="small" style={styles.grow}>
              למחוק את התגובה?
            </Text>
            <Pressable onPress={remove} disabled={busy} accessibilityRole="button" hitSlop={6}>
              <Text variant="smallBold" style={styles.danger}>
                כן, למחוק
              </Text>
            </Pressable>
            <Pressable onPress={() => setConfirming(false)} accessibilityRole="button" hitSlop={6}>
              <Text variant="small" muted>
                לא
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setConfirming(true)} accessibilityRole="button" hitSlop={6} style={styles.end}>
            <Text variant="caption" muted>
              מחיקה
            </Text>
          </Pressable>
        ))}
    </View>
  );
}

function NewComment({ userId, photoId, onAdded }: { userId: string; photoId: string; onAdded: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = text.trim();

  async function send() {
    if (!trimmed) {
      setError('כתבי תגובה קודם.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addComment(userId, photoId, trimmed);
      setText('');
      onAdded();
    } catch {
      setError('התגובה לא נשלחה. כדאי לנסות שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(null);
        }}
        placeholder="כתבי תגובה מכבדת…"
        placeholderTextColor={Colors.textSecondary}
        multiline
        maxLength={MAX_COMMENT_LENGTH}
        style={styles.input}
        accessibilityLabel="תגובה חדשה"
      />
      {error ? (
        <Text variant="small" style={styles.danger} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="פרסום התגובה" onPress={send} busy={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.medium,
    backgroundColor: Colors.placeholder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  link: {
    color: Colors.accent,
  },
  section: {
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comment: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  end: {
    alignSelf: 'flex-end',
  },
  input: {
    minHeight: 80,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    fontFamily: Fonts.regular,
    color: Colors.text,
    textAlign: 'right',
    textAlignVertical: 'top',
  },
  danger: {
    color: Colors.accentPressed,
  },
});
