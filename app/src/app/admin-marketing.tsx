import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchMarketingList, type MarketingContact } from '@/lib/marketing';
import { useAsync } from '@/lib/use-async';

function day(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

// An email to everyone on the list, each hidden from the others (BCC), with the subject
// starting "פרסומת" as the law asks, and a way to stop at the bottom.
function mailToAll(contacts: MarketingContact[]) {
  const bcc = contacts.map((c) => c.email).join(',');
  const body = [
    '',
    '',
    '',
    '—',
    'BeautyLink',
    'להסרה מרשימת התפוצה: משיבים למייל הזה במילה "הסר", או מכבים את "קבלת עדכונים ומבצעים במייל" בלשונית פרופיל באפליקציה.',
  ].join('\n');
  return `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent('פרסומת: ')}&body=${encodeURIComponent(body)}`;
}

// The admin's mailing list: everyone who agreed to receive updates and advertising by email.
export default function AdminMarketingScreen() {
  const { loading, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { state, reload } = useAsync(isAdmin ? 'admin-marketing' : null, fetchMarketingList);

  if (loading || !profile) return <Screen>{null}</Screen>;
  if (!isAdmin) {
    return (
      <Screen>
        <Text muted>המסך הזה מיועד לניהול בלבד.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">רשימת תפוצה</Text>
      <Text muted>מי שהסכימה לקבל עדכונים, מבצעים ופרסומות במייל. מותר לשלוח דיוור פרסומי רק להן.</Text>

      {state.status === 'loading' ? (
        <Text muted>טוענים…</Text>
      ) : state.status === 'error' ? (
        <>
          <View style={styles.card}>
            <Text muted>לא הצלחנו לטעון את הרשימה. כדאי לבדוק את החיבור לאינטרנט.</Text>
          </View>
          <Button label="לנסות שוב" onPress={reload} />
        </>
      ) : state.data.length === 0 ? (
        <View style={styles.card}>
          <Text muted>עוד אף אחת לא הסכימה לקבל דיוור.</Text>
        </View>
      ) : (
        <>
          <Text variant="smallBold">
            {state.data.length} נמענות · {state.data.filter((c) => c.is_pro).length} בעלות מקצוע
          </Text>
          <Button label="מייל לכולן (בעותק מוסתר)" onPress={() => Linking.openURL(mailToAll(state.data))} />
          <View style={styles.card}>
            {state.data.map((c) => (
              <View key={c.email} style={styles.row}>
                <View style={styles.grow}>
                  <Text variant="smallBold">{c.full_name || 'ללא שם'}</Text>
                  <Text variant="small" muted selectable>
                    {c.email}
                  </Text>
                </View>
                <View style={styles.side}>
                  <Text variant="caption" style={c.is_pro ? styles.pro : undefined}>
                    {c.is_pro ? 'בעלת מקצוע' : 'לקוחה'}
                  </Text>
                  <Text variant="caption" muted>
                    {day(c.agreed_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Text variant="caption" muted>
            כל מייל פרסומי: המילה &quot;פרסומת&quot; בתחילת הנושא, ושורה בסוף איך מסירים את עצמך מהרשימה. כפתור
            המייל מכין את שתיהן.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  side: {
    alignItems: 'flex-end',
  },
  pro: {
    color: Colors.secondaryOnTint,
  },
});
