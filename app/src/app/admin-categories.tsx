import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  addCategory,
  addSubcategory,
  fetchAllCategories,
  nameErrorText,
  saveOrder,
  updateCategory,
  updateSubcategory,
  type AdminCategory,
} from '@/lib/admin-categories';
import { useAuth } from '@/lib/auth';
import type { Subcategory } from '@/lib/categories';
import { useAsync } from '@/lib/use-async';

// The admin edits the categories and the treatments in each: adds, renames, reorders and
// hides them. Nothing is deleted: a hidden treatment keeps the pros who chose it, leaves
// search and sign-up, and can be shown again.
export default function AdminCategoriesScreen() {
  const { loading, session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { state, reload } = useAsync(isAdmin ? 'admin-categories' : null, fetchAllCategories);
  const [open, setOpen] = useState<number | null>(null);

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
        <Text variant="title">תחומים וטיפולים</Text>
        <View style={styles.card}>
          <Text>המסך הזה מיועד למנהלי BeautyLink בלבד.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen inTabs={false}>
      <Text variant="title">תחומים וטיפולים</Text>
      <Text muted>
        התחומים במסך הבית ובחיפוש, והטיפולים שבכל תחום. בעלות מקצוע בוחרות טיפולים בהרשמה, ולקוחות
        מסננות לפיהם בחיפוש. טיפול מוסתר לא מוצע יותר, אבל בעלות מקצוע שכבר בחרו בו שומרות אותו.
      </Text>

      {state.status === 'loading' ? (
        <Text muted>טוענים…</Text>
      ) : state.status === 'error' ? (
        <>
          <View style={styles.card}>
            <Text muted>לא הצלחנו לטעון את התחומים. כדאי לבדוק את החיבור לאינטרנט.</Text>
          </View>
          <Button label="לנסות שוב" onPress={reload} />
        </>
      ) : (
        <>
          {state.data.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              siblings={state.data}
              index={index}
              open={open === category.id}
              onToggle={() => setOpen(open === category.id ? null : category.id)}
              onChanged={reload}
            />
          ))}
          <NewItem
            label="תחום חדש"
            placeholder="למשל: טיפוח לכלה"
            onAdd={(name) => addCategory(name, state.data.length + 1).then(reload)}
          />
        </>
      )}
    </Screen>
  );
}

function CategoryCard({
  category,
  siblings,
  index,
  open,
  onToggle,
  onChanged,
}: {
  category: AdminCategory;
  siblings: AdminCategory[];
  index: number;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const visibleCount = category.subcategories.filter((s) => s.is_visible).length;

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(nameErrorText(e));
    }
  }

  function move(delta: number) {
    const ids = siblings.map((c) => c.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => saveOrder('categories', ids));
  }

  return (
    <View style={[styles.card, !category.is_visible && styles.hidden]}>
      <View style={styles.row}>
        <Pressable style={styles.grow} onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <Text variant="heading">
            {category.name}
            {!category.is_visible ? ' · מוסתר' : ''}
          </Text>
          <Text variant="caption" muted>
            {visibleCount} טיפולים{open ? '' : ' · לחיצה לעריכה'}
          </Text>
        </Pressable>
        <Arrows onUp={() => move(-1)} onDown={() => move(1)} name={category.name} />
      </View>

      {open && (
        <View style={styles.inner}>
          <RenameRow
            current={category.name}
            onSave={(name) => run(() => updateCategory(category.id, { name }))}
          />
          <Pressable
            onPress={() => run(() => updateCategory(category.id, { is_visible: !category.is_visible }))}
            accessibilityRole="button">
            <Text variant="smallBold" style={styles.link}>
              {category.is_visible ? 'הסתרת התחום' : 'הצגת התחום שוב'}
            </Text>
          </Pressable>

          <Text variant="smallBold">הטיפולים</Text>
          {category.subcategories.map((sub, i) => (
            <SubRow
              key={sub.id}
              sub={sub}
              index={i}
              siblings={category.subcategories}
              onRun={run}
            />
          ))}
          <NewItem
            label="טיפול חדש"
            placeholder="למשל: ציפורני ג'ל לכלה"
            onAdd={(name) =>
              run(() => addSubcategory(category.id, name, category.subcategories.length + 1))
            }
          />
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

function SubRow({
  sub,
  index,
  siblings,
  onRun,
}: {
  sub: Subcategory;
  index: number;
  siblings: Subcategory[];
  onRun: (action: () => Promise<void>) => void;
}) {
  const [editing, setEditing] = useState(false);

  function move(delta: number) {
    const ids = siblings.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onRun(() => saveOrder('subcategories', ids));
  }

  if (editing) {
    return (
      <RenameRow
        current={sub.name}
        onSave={(name) => {
          setEditing(false);
          onRun(() => updateSubcategory(sub.id, { name }));
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <View style={styles.subRow}>
      <Text style={[styles.grow, !sub.is_visible && styles.hiddenText]}>
        {sub.name}
        {!sub.is_visible ? ' · מוסתר' : ''}
      </Text>
      <Pressable onPress={() => setEditing(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`שינוי השם של ${sub.name}`}>
        <Text variant="small" style={styles.link}>שם</Text>
      </Pressable>
      <Pressable
        onPress={() => onRun(() => updateSubcategory(sub.id, { is_visible: !sub.is_visible }))}
        hitSlop={6}
        accessibilityRole="button">
        <Text variant="small" style={styles.link}>{sub.is_visible ? 'הסתרה' : 'הצגה'}</Text>
      </Pressable>
      <Arrows onUp={() => move(-1)} onDown={() => move(1)} name={sub.name} />
    </View>
  );
}

function Arrows({ onUp, onDown, name }: { onUp: () => void; onDown: () => void; name: string }) {
  return (
    <View style={styles.arrows}>
      <Pressable onPress={onUp} hitSlop={6} style={styles.arrow} accessibilityRole="button" accessibilityLabel={`הזזת ${name} למעלה`}>
        <Text variant="smallBold">▲</Text>
      </Pressable>
      <Pressable onPress={onDown} hitSlop={6} style={styles.arrow} accessibilityRole="button" accessibilityLabel={`הזזת ${name} למטה`}>
        <Text variant="smallBold">▼</Text>
      </Pressable>
    </View>
  );
}

function RenameRow({
  current,
  onSave,
  onCancel,
}: {
  current: string;
  onSave: (name: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(current);
  const trimmed = name.trim();
  return (
    <View style={styles.subRow}>
      <TextInput
        value={name}
        onChangeText={setName}
        style={[styles.input, styles.grow]}
        accessibilityLabel="שם"
        maxLength={40}
      />
      <Pressable
        onPress={() => trimmed && trimmed !== current && onSave(trimmed)}
        accessibilityRole="button"
        hitSlop={6}>
        <Text variant="smallBold" style={styles.link}>שמירה</Text>
      </Pressable>
      {onCancel ? (
        <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={6}>
          <Text variant="small" muted>ביטול</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function NewItem({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  async function add() {
    if (!trimmed) {
      setError('כתבי שם קודם.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAdd(trimmed);
      setName('');
    } catch (e) {
      setError(nameErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.newItem}>
      <View style={styles.subRow}>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          style={[styles.input, styles.grow]}
          accessibilityLabel={label}
          maxLength={40}
        />
        <Pressable onPress={add} disabled={busy} style={styles.addButton} accessibilityRole="button">
          <Text variant="smallBold" style={styles.addText}>
            {busy ? '…' : `+ ${label}`}
          </Text>
        </Pressable>
      </View>
      {error ? (
        <Text variant="small" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
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
  hidden: {
    backgroundColor: Colors.background,
  },
  hiddenText: {
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  inner: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  arrows: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  link: {
    color: Colors.accent,
  },
  input: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    fontFamily: Fonts.regular,
    color: Colors.text,
    textAlign: 'right',
  },
  newItem: {
    gap: Spacing.one,
  },
  addButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  addText: {
    color: Colors.onInk,
  },
  error: {
    color: Colors.accentPressed,
  },
});
