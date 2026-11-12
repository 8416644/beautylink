import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CategoryImage } from '@/components/category-image';
import { FavoriteButton } from '@/components/favorite-button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { fetchSubcategoriesOf, useCategories, type Category } from '@/lib/categories';
import { useProsInCategory, type ProSummary } from '@/lib/pros';
import { searchPros } from '@/lib/search';
import { useAsync } from '@/lib/use-async';

export default function SearchScreen() {
  const { category: slug, q } = useLocalSearchParams<{ category?: string; q?: string }>();
  const { state: categoriesState, reload } = useCategories();

  const categories = categoriesState.status === 'ready' ? categoriesState.categories : [];
  const selected = q ? undefined : categories.find((c) => c.slug === slug);
  // The typed text, kept in step with the address when the home screen sends a search.
  const [text, setText] = useState({ from: q ?? '', value: q ?? '' });
  const value = text.from === (q ?? '') ? text.value : (q ?? '');

  function submit() {
    const next = value.trim();
    router.setParams({ q: next || undefined, category: undefined });
  }

  return (
    <Screen>
      <Text variant="title">חיפוש</Text>

      <View style={styles.searchBox}>
        <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={Colors.textSecondary} size={20} />
        <TextInput
          value={value}
          onChangeText={(v) => setText({ from: q ?? '', value: v })}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="שם, טיפול או עיר"
          placeholderTextColor={Colors.textSecondary}
          style={styles.searchInput}
          accessibilityLabel="חיפוש חופשי"
        />
        {value.trim() ? (
          <Pressable onPress={submit} hitSlop={8} accessibilityRole="button" style={styles.searchGo}>
            <Text variant="smallBold" style={styles.searchGoText}>
              חיפוש
            </Text>
          </Pressable>
        ) : null}
      </View>

      {categoriesState.status === 'error' ? (
        <ErrorCard message="לא הצלחנו לטעון את הקטגוריות." onRetry={reload} />
      ) : (
        <View style={styles.chips}>
          {categories.map((category) => {
            const active = category.slug === slug;
            return (
              <Pressable
                key={category.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => router.setParams({ category: category.slug, q: undefined })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <CategoryImage icon={category.icon ?? category.slug} size={24} />
                <Text variant="smallBold" style={active && styles.chipTextActive}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {q ? (
        <TextResults text={q} />
      ) : categoriesState.status !== 'ready' ? null : selected ? (
        <CategoryResults category={selected} />
      ) : (
        <View style={styles.card}>
          <Text muted>
            {slug
              ? 'הקטגוריה הזו לא נמצאה. אפשר לבחור קטגוריה אחרת מהרשימה.'
              : 'בחרי קטגוריה כדי לראות את בעלות המקצוע שעובדות בה.'}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function TextResults({ text }: { text: string }) {
  const { state, reload } = useAsync(`text:${text}`, () => searchPros(text));
  return (
    <View style={styles.section}>
      <Text variant="heading">תוצאות עבור &quot;{text}&quot;</Text>
      {state.status === 'loading' ? (
        <Text muted>מחפשים…</Text>
      ) : state.status === 'error' ? (
        <ErrorCard message="החיפוש לא הצליח." onRetry={reload} />
      ) : state.data.length === 0 ? (
        <View style={styles.card}>
          <Text variant="smallBold">לא מצאנו בעלות מקצוע שמתאימות</Text>
          <Text muted>אפשר לנסות מילה אחרת, למשל שם של טיפול או עיר, או לבחור קטגוריה למעלה.</Text>
        </View>
      ) : (
        state.data.map((pro) => <ProCard key={pro.user_id} pro={pro} treatments={[]} />)
      )}
    </View>
  );
}

function CategoryResults({ category }: { category: Category }) {
  const { state, retry } = useProsInCategory(category.id);
  const { state: subsState } = useAsync(`subs:${category.id}`, () => fetchSubcategoriesOf(category.id));
  const subs = subsState.status === 'ready' ? subsState.data : [];
  // The chosen treatment, kept per category so switching category starts from "all".
  const [chosen, setChosen] = useState<{ category: number; sub: number } | null>(null);
  const sub = chosen?.category === category.id ? chosen.sub : null;
  const subName = subs.find((s) => s.id === sub)?.name;

  const pros =
    state.status === 'ready'
      ? sub === null
        ? state.pros
        : state.pros.filter((p) => p.subcategory_ids.includes(sub))
      : [];

  return (
    <View style={styles.section}>
      <Text variant="heading">{category.name}</Text>
      {subs.length > 1 && (
        <View style={styles.subChips} accessibilityRole="radiogroup" accessibilityLabel="סינון לפי טיפול">
          <SubChip label="הכול" active={sub === null} onPress={() => setChosen(null)} />
          {subs.map((s) => (
            <SubChip
              key={s.id}
              label={s.name}
              active={sub === s.id}
              onPress={() => setChosen({ category: category.id, sub: s.id })}
            />
          ))}
        </View>
      )}
      {state.status === 'loading' ? (
        <Text muted>טוענים בעלות מקצוע…</Text>
      ) : state.status === 'error' ? (
        <ErrorCard message="לא הצלחנו לטעון את בעלות המקצוע." onRetry={retry} />
      ) : state.pros.length === 0 ? (
        <View style={styles.card}>
          <Text variant="smallBold">עדיין אין בעלות מקצוע בקטגוריה הזו</Text>
          <Text muted>בעלות מקצוע חדשות מצטרפות כל הזמן. כדאי לבדוק שוב בקרוב.</Text>
        </View>
      ) : pros.length === 0 ? (
        <View style={styles.card}>
          <Text variant="smallBold">עדיין אין בעלות מקצוע ל{subName ?? 'טיפול הזה'}</Text>
          <Text muted>אפשר לבחור &quot;הכול&quot; או טיפול אחר.</Text>
        </View>
      ) : (
        pros.map((pro) => (
          <ProCard
            key={pro.user_id}
            pro={pro}
            treatments={subs.filter((s) => pro.subcategory_ids.includes(s.id)).map((s) => s.name)}
          />
        ))
      )}
    </View>
  );
}

function SubChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.subChip, active && styles.subChipActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}>
      <Text variant="small" style={active && styles.subChipTextActive}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProCard({ pro, treatments }: { pro: ProSummary; treatments: string[] }) {
  const place = [pro.neighborhood, pro.city].filter(Boolean).join(', ');
  const where = [
    pro.works_at_salon && 'בסלון',
    pro.works_at_home && 'בבית',
    pro.travels_to_client && 'מגיעה אלייך',
  ].filter(Boolean);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/pro/[id]', params: { id: pro.user_id } })}
      accessibilityRole="link"
      accessibilityLabel={`הדף של ${pro.display_name}`}>
      <View style={styles.proHeader}>
        <Text variant="heading" style={styles.proName}>
          {pro.display_name}
        </Text>
        {pro.rating_count > 0 ? (
          <View style={styles.rating}>
            <Icon name={{ ios: 'star.fill', android: 'star', web: 'star' }} size={16} color={Colors.star} />
            <Text variant="smallBold">{Number(pro.rating_avg).toFixed(1)}</Text>
            <Text variant="small" muted>
              ({pro.rating_count})
            </Text>
          </View>
        ) : (
          <View style={styles.newBadge}>
            <Text variant="caption" style={styles.newBadgeText}>
              חדשה
            </Text>
          </View>
        )}
        <FavoriteButton proId={pro.user_id} proName={pro.display_name} />
      </View>
      <Text variant="small" muted>
        {place}
      </Text>
      {treatments.length > 0 && (
        <View style={styles.tags}>
          {treatments.map((name) => (
            <View key={name} style={styles.treatment}>
              <Text variant="caption" style={styles.treatmentText}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      )}
      {where.length > 0 && (
        <View style={styles.tags}>
          {where.map((label) => (
            <View key={label as string} style={styles.tag}>
              <Text variant="caption" style={styles.tagText}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.card}>
      <Text muted>{message} כדאי לבדוק את החיבור לאינטרנט.</Text>
      <Pressable style={styles.retry} onPress={onRetry} accessibilityRole="button">
        <Text variant="smallBold" style={styles.retryText}>
          לנסות שוב
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    height: 46,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'right',
  },
  searchGo: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  searchGoText: {
    color: Colors.onInk,
  },
  subChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  subChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  subChipActive: {
    backgroundColor: Colors.accentTint,
    borderColor: Colors.accent,
  },
  subChipTextActive: {
    color: Colors.accentOnTint,
  },
  treatment: {
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
  },
  treatmentText: {
    color: Colors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  chipTextActive: {
    color: Colors.surface,
  },
  section: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPressed: {
    borderColor: Colors.accent,
  },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  proName: {
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  newBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondaryTint,
  },
  newBadgeText: {
    color: Colors.secondaryOnTint,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentTint,
  },
  tagText: {
    color: Colors.accentOnTint,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  retryText: {
    color: Colors.surface,
  },
});
