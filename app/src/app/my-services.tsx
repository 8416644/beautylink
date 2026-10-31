import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchOwnProProfile, fetchSubcategories, type Subcategory } from '@/lib/pro-account';
import {
  deleteService,
  fetchOwnServices,
  formatDuration,
  formatPrice,
  saveService,
  setServiceActive,
  type Service,
} from '@/lib/services';
import { useAsync } from '@/lib/use-async';

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

// Where a pro lists her treatments with a price and length; clients see them on her page.
export default function MyServicesScreen() {
  const { loading, session } = useAuth();
  const userId = session?.user.id ?? null;

  const { state, reload } = useAsync(userId, async () => {
    const [pro, services, subcategories] = await Promise.all([
      fetchOwnProProfile(userId!),
      fetchOwnServices(userId!),
      fetchSubcategories(),
    ]);
    return { pro, services, subcategories };
  });

  if (loading) return <Screen>{null}</Screen>;

  if (!userId) {
    return (
      <Screen>
        <Text variant="title">השירותים שלי</Text>
        <Card>
          <Text>כדי לנהל שירותים צריך קודם להתחבר.</Text>
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
          <Text muted>לא הצלחנו לטעון את השירותים. כדאי לבדוק את החיבור לאינטרנט.</Text>
        </Card>
        <Button label="לנסות שוב" onPress={reload} />
      </Screen>
    );
  }

  const { pro, services, subcategories } = state.data;

  if (!pro) {
    return (
      <Screen>
        <Text variant="title">השירותים שלי</Text>
        <Card>
          <Text>קודם מצטרפים כבעלת מקצוע, ואחר כך מוסיפים שירותים ומחירים.</Text>
        </Card>
        <Button label="הצטרפות כבעלת מקצוע" onPress={() => router.replace('/pro-signup')} />
      </Screen>
    );
  }

  if (pro.status === 'suspended') {
    return (
      <Screen>
        <Text variant="title">השירותים שלי</Text>
        <Card>
          <Text>הפרופיל המקצועי שלך מושהה כרגע. לפרטים אפשר לפנות לצוות BeautyLink.</Text>
        </Card>
      </Screen>
    );
  }

  // The treatments she chose in her profile; all of them if she has not chosen yet.
  const own = subcategories.filter((s) => pro.subcategory_ids.includes(s.id));
  const choices = own.length > 0 ? own : subcategories;

  return (
    <ServicesEditor
      proId={userId}
      services={services}
      subcategories={subcategories}
      choices={choices}
      onChanged={reload}
    />
  );
}

type EditorProps = {
  proId: string;
  services: Service[];
  subcategories: Subcategory[];
  choices: Subcategory[];
  onChanged: () => void;
};

function ServicesEditor({ proId, services, subcategories, choices, onChanged }: EditorProps) {
  // null: the list; 'new': a new service; a service: editing it.
  const [editing, setEditing] = useState<Service | 'new' | null>(null);

  if (editing !== null) {
    const current = editing === 'new' ? null : editing;
    // A service keeps its treatment even if she later removed it from her profile.
    const extra = subcategories.find((s) => s.id === current?.subcategory_id);
    const options = extra && !choices.includes(extra) ? [...choices, extra] : choices;
    const nextSort = services.reduce((max, s) => Math.max(max, s.sort), 0) + 1;
    return (
      <ServiceForm
        proId={proId}
        service={current}
        options={options}
        sort={nextSort}
        onDone={(changed) => {
          setEditing(null);
          if (changed) onChanged();
        }}
      />
    );
  }

  const subName = (id: number) => subcategories.find((s) => s.id === id)?.name ?? '';

  return (
    <Screen>
      <Text variant="title">השירותים שלי</Text>
      <Text muted>מה שתוסיפי כאן יופיע כמחירון בדף שלך, וממנו לקוחות יקבעו תורים בהמשך.</Text>

      <Button label="הוספת שירות" onPress={() => setEditing('new')} />

      {services.length === 0 ? (
        <Card>
          <Text variant="smallBold">עדיין אין שירותים</Text>
          <Text muted>למשל: לק ג&apos;ל, 120 ₪, שעה.</Text>
        </Card>
      ) : (
        services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            subcategoryName={subName(service.subcategory_id)}
            onEdit={() => setEditing(service)}
            onChanged={onChanged}
          />
        ))
      )}
    </Screen>
  );
}

type CardProps = {
  service: Service;
  subcategoryName: string;
  onEdit: () => void;
  onChanged: () => void;
};

function ServiceCard({ service, subcategoryName, onEdit, onChanged }: CardProps) {
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

  return (
    <View style={[styles.card, !service.is_active && styles.hidden]}>
      <View style={styles.row}>
        <Text variant="heading" style={styles.grow}>
          {service.name}
        </Text>
        <Text variant="heading">{formatPrice(service.price_ils)}</Text>
      </View>
      <Text variant="small" muted>
        {[subcategoryName, formatDuration(service.duration_min)].filter(Boolean).join(' · ')}
      </Text>
      {service.description ? <Text variant="small">{service.description}</Text> : null}
      {!service.is_active && (
        <Text variant="caption" style={styles.hiddenText}>
          מוסתר. לקוחות לא רואות את השירות הזה.
        </Text>
      )}

      {confirmDelete ? (
        <View style={styles.actions}>
          <Text variant="small">למחוק את &quot;{service.name}&quot;? אי אפשר לבטל את זה.</Text>
          <Button label="כן, למחוק" onPress={() => run(() => deleteService(service.id))} busy={busy} />
          <Button label="ביטול" variant="secondary" onPress={() => setConfirmDelete(false)} />
        </View>
      ) : (
        <View style={styles.chips}>
          <Chip label="עריכה" selected={false} onPress={onEdit} />
          <Chip
            label={service.is_active ? 'הסתרה' : 'הצגה'}
            selected={false}
            onPress={() => run(() => setServiceActive(service.id, !service.is_active))}
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
  proId: string;
  service: Service | null;
  options: Subcategory[];
  sort: number;
  onDone: (changed: boolean) => void;
};

function ServiceForm({ proId, service, options, sort, onDone }: FormProps) {
  const [subcategoryId, setSubcategoryId] = useState<number | null>(
    service?.subcategory_id ?? (options.length === 1 ? options[0].id : null),
  );
  const [name, setName] = useState(service?.name ?? '');
  const [price, setPrice] = useState(service ? String(service.price_ils) : '');
  const [duration, setDuration] = useState(service ? String(service.duration_min) : '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNumber = price.trim() === '' ? NaN : Number(price.replace(',', '.'));
  const durationNumber = duration.trim() === '' ? NaN : Number(duration);
  const problems = [
    subcategoryId === null && 'סוג הטיפול',
    name.trim() === '' && 'שם השירות',
    !(priceNumber >= 0 && priceNumber < 1000000) && 'מחיר',
    !(Number.isInteger(durationNumber) && durationNumber >= 5 && durationNumber <= 600) &&
      'משך (מספר דקות בין 5 ל-600)',
  ].filter((p): p is string => typeof p === 'string');

  function pickSubcategory(sub: Subcategory) {
    setSubcategoryId(sub.id);
    // The treatment's name is a good start for the service's name.
    if (name.trim() === '') setName(sub.name);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await saveService(
        proId,
        {
          subcategory_id: subcategoryId!,
          name: name.trim(),
          description: description.trim(),
          duration_min: durationNumber,
          price_ils: Math.round(priceNumber * 100) / 100,
        },
        service?.id ?? null,
        sort,
      );
      onDone(true);
    } catch {
      setError('לא הצלחנו לשמור. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="title">{service ? 'עריכת שירות' : 'שירות חדש'}</Text>

      <View style={styles.section}>
        <Text variant="smallBold">סוג הטיפול</Text>
        <View style={styles.chips}>
          {options.map((sub) => (
            <Chip
              key={sub.id}
              label={sub.name}
              selected={subcategoryId === sub.id}
              onPress={() => pickSubcategory(sub)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="שם השירות"
        value={name}
        onChangeText={setName}
        hint="כך הלקוחות יראו אותו, למשל: לק ג'ל + עיצוב"
      />
      <TextField
        label="מחיר (₪)"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />

      <View style={styles.section}>
        <TextField
          label="משך הטיפול (בדקות)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />
        <View style={styles.chips}>
          {DURATION_PRESETS.map((minutes) => (
            <Chip
              key={minutes}
              label={formatDuration(minutes)}
              selected={durationNumber === minutes}
              onPress={() => setDuration(String(minutes))}
            />
          ))}
        </View>
      </View>

      <TextField
        label="תיאור (לא חובה)"
        value={description}
        onChangeText={setDescription}
        multiline
        hint="מה כולל הטיפול, למשל: הסרה, מניקור ולק ג'ל"
      />

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

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  hidden: {
    backgroundColor: Colors.background,
  },
  hiddenText: {
    color: Colors.secondaryOnTint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  actions: {
    gap: Spacing.two,
  },
  error: {
    color: Colors.accentPressed,
  },
});
