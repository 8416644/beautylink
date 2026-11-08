import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useRefreshGeneration } from '@/lib/refresh';
import { fetchAdminStats, STATS_PERIODS, type AdminStats, type StatsPeriod } from '@/lib/stats';

// Refreshes on its own, so "online now" stays current while the screen is open.
const REFRESH_MS = 30_000;

const PREV_LABEL: Record<StatsPeriod, string> = {
  today: 'אתמול באותה שעה',
  week: 'אותו זמן בשבוע שעבר',
  month: 'אותו זמן בחודש שעבר',
  year: 'אותו זמן בשנה שעברה',
  all: '',
};

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

type Result =
  | { period: StatsPeriod; status: 'ready'; data: AdminStats }
  | { period: StatsPeriod; status: 'error' };

function num(n: number) {
  return n.toLocaleString('he-IL');
}

// "2026-11-01" as a day of the month and a month, read without time zones.
function parts(isoDay: string) {
  const [y, m, d] = isoDay.split('-').map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function periodNote(period: StatsPeriod, from: string | null) {
  if (period === 'all' || !from) return 'מאז שהאפליקציה עלתה';
  const { y, m, d } = parts(from);
  if (period === 'today') return `היום, ${d}.${m}`;
  if (period === 'week') return `מיום ראשון ${d}.${m}`;
  if (period === 'month') return `מ-1.${m}.${y}`;
  return `מ-1.1.${y}`;
}

export default function AdminStatsScreen() {
  const { loading, session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRefreshGeneration();

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = () =>
      fetchAdminStats(period).then(
        (data) => !cancelled && setResult({ period, status: 'ready', data }),
        // A failed refresh keeps the numbers already on screen.
        () =>
          !cancelled &&
          setResult((prev) =>
            prev?.period === period && prev.status === 'ready' ? prev : { period, status: 'error' },
          ),
      );
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAdmin, period, attempt, generation]);

  if (loading || (session !== null && profile === null)) {
    return (
      <Screen inTabs={false}>
        <Text muted>טוענים…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen inTabs={false}>
        <Text variant="title">נתוני האפליקציה</Text>
        <View style={styles.card}>
          <Text>המסך הזה מיועד למנהלי BeautyLink בלבד.</Text>
        </View>
      </Screen>
    );
  }

  const current = result?.period === period ? result : null;

  return (
    <Screen inTabs={false}>
      <Text variant="title">נתוני האפליקציה</Text>
      <View style={styles.chips}>
        {STATS_PERIODS.map((p) => (
          <Chip
            key={p.key}
            label={p.label}
            selected={period === p.key}
            onPress={() => setPeriod(p.key)}
          />
        ))}
      </View>

      {current === null ? (
        <Text muted>טוענים…</Text>
      ) : current.status === 'error' ? (
        <>
          <View style={styles.card}>
            <Text muted>לא הצלחנו לטעון את הנתונים. כדאי לבדוק את החיבור לאינטרנט.</Text>
          </View>
          <Button label="לנסות שוב" onPress={() => setAttempt((n) => n + 1)} />
        </>
      ) : (
        <Stats period={period} data={current.data} />
      )}
    </Screen>
  );
}

function Stats({ period, data }: { period: StatsPeriod; data: AdminStats }) {
  const diff = data.prev_visits === null ? null : data.visits - data.prev_visits;
  return (
    <>
      <Text variant="caption" muted>
        {periodNote(period, data.from)}
      </Text>

      <View style={styles.online}>
        <View style={styles.dot} />
        <Text variant="smallBold" style={styles.grow}>
          באפליקציה עכשיו
        </Text>
        <Text variant="heading">{num(data.online)}</Text>
      </View>

      <View style={styles.hero}>
        <Text variant="small" style={styles.onInkMuted}>
          נכנסו לאפליקציה
        </Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroNumber}>{num(data.visits)}</Text>
          {diff !== null ? (
            <Text variant="caption" style={styles.inkAccent}>
              {diff > 0 ? `+${num(diff)}` : num(diff)} לעומת {PREV_LABEL[period]}
            </Text>
          ) : null}
        </View>
        {data.series.length > 0 ? <VisitsChart period={period} series={data.series} /> : null}
        <Text variant="caption" style={styles.onInkMuted}>
          כל טלפון נספר פעם אחת ביום, גם בלי הרשמה.
        </Text>
      </View>

      <View style={styles.grid}>
        <Tile
          label="נרשמו"
          value={data.signups}
          note={`סה״כ רשומות ${num(data.total_users)}`}
        />
        <Tile
          label="בעלות מקצוע חדשות"
          value={data.new_pros}
          note={`${num(data.pending_pros)} ממתינות לאישור`}
        />
        <Tile label="תורים שנקבעו" value={data.booked} note={`${num(data.cancelled)} בוטלו`} />
        <Tile
          label="ביקורות"
          value={data.reviews}
          note={data.reviews_avg === null ? 'אין עדיין דירוג' : `ממוצע ★ ${data.reviews_avg}`}
        />
        <Tile label="בעלות מקצוע פעילות" value={data.approved_pros} note="מאושרות, סה״כ" />
        <Tile label="שמירות למועדפים" value={data.favorites} note="בתקופה" />
        <Tile
          label="ביטלו רישום"
          value={data.deleted_users}
          note={`מתוכן בעלות מקצוע ${num(data.deleted_pros)}`}
        />
      </View>

      <View style={styles.soon}>
        <Text variant="smallBold" style={styles.soonText}>
          ניהול כספי · בקרוב
        </Text>
        <Text variant="small" style={styles.soonText}>
          הכנסות מפרסומות בתשלום, מנויי V.I.P לבעלות מקצוע ודוחות לפי חודש.
        </Text>
      </View>
    </>
  );
}

function Tile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <View style={styles.tile}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="heading">{num(value)}</Text>
      <Text variant="caption" style={styles.tileNote}>
        {note}
      </Text>
    </View>
  );
}

function VisitsChart({
  period,
  series,
}: {
  period: StatsPeriod;
  series: AdminStats['series'];
}) {
  const max = Math.max(1, ...series.map((s) => s.count));
  const byMonth = period === 'year' || period === 'all';
  // A month has too many days to name them all; every fifth one is enough.
  const label = (start: string, i: number) => {
    const p = parts(start);
    if (byMonth) return period === 'all' && series.length > 12 ? `${p.m}.${p.y % 100}` : MONTHS[p.m - 1];
    if (period === 'week') return WEEKDAYS[p.weekday];
    return i % 5 === 0 ? String(p.d) : '';
  };
  return (
    <View>
      <View style={styles.bars}>
        {series.map((s) => (
          <View key={s.start} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                { height: `${Math.max(6, Math.round((s.count / max) * 100))}%` },
                s.count === 0 && styles.barEmpty,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.barLabels}>
        {series.map((s, i) => (
          <Text key={s.start} variant="caption" style={[styles.barLabel, styles.onInkMuted]}>
            {label(s.start, i)}
          </Text>
        ))}
      </View>
    </View>
  );
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  online: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2FB36B',
  },
  hero: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.ink,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  heroNumber: {
    fontSize: 34,
    lineHeight: 40,
    color: Colors.onInk,
  },
  onInkMuted: {
    color: Colors.onInkMuted,
  },
  inkAccent: {
    color: Colors.inkAccent,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 72,
  },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 3,
    backgroundColor: Colors.inkAccent,
  },
  barEmpty: {
    backgroundColor: Colors.inkPressed,
  },
  barLabels: {
    flexDirection: 'row',
    gap: 3,
    marginTop: Spacing.one,
  },
  barLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tileNote: {
    color: Colors.accentOnTint,
  },
  soon: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.accentTint,
  },
  soonText: {
    color: Colors.accentOnTint,
  },
});
