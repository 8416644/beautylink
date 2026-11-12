import Constants from 'expo-constants';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export const FEEDBACK_EMAIL = 'beautylink.ai@gmail.com';

const PLATFORM_NAME: Record<string, string> = { ios: 'אייפון', android: 'אנדרואיד', web: 'אתר' };

// A ready email to BeautyLink: a subject, a few lines to start from, and the app version and
// kind of device at the bottom, so a reported problem can be traced. Nothing personal.
function feedbackUrl() {
  const version = Constants.expoConfig?.version ?? '';
  const body = [
    'סוג הפנייה: ביקורת / הערה / הצעה לשיפור / תקלה',
    '',
    'מה רצית לספר לנו?',
    '',
    '',
    '',
    `— גרסה ${version}, ${PLATFORM_NAME[Platform.OS] ?? Platform.OS}`,
  ].join('\n');
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('משוב על BeautyLink')}&body=${encodeURIComponent(body)}`;
}

async function sendFeedback() {
  const fallback = `אפשר לכתוב לנו ל-${FEEDBACK_EMAIL}`;
  try {
    await Linking.openURL(feedbackUrl());
  } catch {
    if (Platform.OS === 'web') window.alert(fallback);
    else Alert.alert('לא נמצאה אפליקציית מייל', fallback);
  }
}

// One quiet line on the profile screen that opens an email for comments and ideas.
export function FeedbackRow() {
  return (
    <View style={styles.row}>
      <Icon name={{ ios: 'bubble.left', android: 'chat_bubble', web: 'chat_bubble' }} color={Colors.accent} size={18} />
      <Text variant="small" style={styles.text}>
        יש לך הערה או רעיון? נשמח לשמוע
      </Text>
      <Pressable
        onPress={sendFeedback}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="שליחת משוב במייל">
        <Text variant="caption" style={styles.buttonText}>
          שליחת משוב
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    flex: 1,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: Fonts.medium,
    color: Colors.text,
  },
});
