import { Linking, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Spacing } from '@/constants/theme';
import { CONTACT_EMAIL, LEGAL_UPDATED, type LegalSection } from '@/constants/legal';

// A legal document: title, last update, numbered sections, and how to reach BeautyLink.
export function LegalDocument({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <Screen inTabs={false}>
      <View style={styles.head}>
        <Text variant="title">{title}</Text>
        <Text variant="caption" muted>
          עודכן לאחרונה: {LEGAL_UPDATED}
        </Text>
      </View>
      {sections.map((section, i) => (
        <View key={section.title} style={styles.section}>
          <Text variant="heading">
            {i + 1}. {section.title}
          </Text>
          {section.paragraphs.map((p) => (
            <Text key={p} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>
      ))}
      <View style={styles.section}>
        <Text variant="heading">יצירת קשר</Text>
        {CONTACT_EMAIL ? (
          <Text style={styles.paragraph}>
            לשאלות ובקשות:{' '}
            <Text
              style={styles.link}
              accessibilityRole="link"
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
              {CONTACT_EMAIL}
            </Text>
          </Text>
        ) : (
          <Text style={styles.paragraph}>כתובת המייל של BeautyLink לשאלות ובקשות תפורסם כאן בקרוב.</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  paragraph: {
    lineHeight: 24,
  },
  link: {
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
});
