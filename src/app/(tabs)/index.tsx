import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { collectedWordIds, MissingLang, reportMissingWord, searchWords } from '@/lib/db';
import { reverseConjugationLookup, type ReverseMatch } from '@/lib/reverse-conjugation';
import { CEFR_LEVELS, CEFRLevel, PartOfSpeech, Word } from '@/lib/types';
import { TOPICS } from '@/data/topics';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getFrequency, type Frequency } from '@/lib/wordbank-meta';

const ACCENT = '#C8793A';
const ACCENT_DIM = '#E5B98A';
const SURFACE = '#F0EDE8';
const WEB_TOP = Platform.OS === 'web' ? 52 : 0;

function ReportInline({ query, onSubmit, accentColor, mutedColor }: {
  query: string;
  onSubmit: (lang: MissingLang) => void;
  accentColor: string;
  mutedColor: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={styles.reportToggle}>
        <Text style={[styles.reportToggleText, { color: mutedColor }]}>缺词？</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.reportPicker}>
      {(['es', 'zh', 'en'] as MissingLang[]).map((lang) => (
        <Pressable key={lang} onPress={() => { onSubmit(lang); setOpen(false); }}
          style={[styles.reportLangBtn, { borderColor: accentColor }]}>
          <Text style={[styles.reportLangText, { color: accentColor }]}>
            {lang === 'es' ? '西语' : lang === 'zh' ? '中文' : 'EN'}
          </Text>
        </Pressable>
      ))}
      <Pressable onPress={() => setOpen(false)}>
        <Text style={[styles.reportLangText, { color: mutedColor }]}>×</Text>
      </Pressable>
    </View>
  );
}

type PosOption = PartOfSpeech | 'other';
type DropdownId = 'level' | 'pos' | 'frequency' | 'topic' | null;

interface ConjugMatchResult extends ReverseMatch { wordId: number }

const POS_OPTIONS: { label: string; value: PosOption }[] = [
  { label: '名词', value: 'noun' },
  { label: '动词', value: 'verb' },
  { label: '形容词', value: 'adjective' },
  { label: '副词', value: 'adverb' },
  { label: '介词', value: 'preposition' },
  { label: '其他', value: 'other' },
];

const MAIN_POS: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'preposition'];

function WordRow({ item, isCollected, onPress, textColor }: {
  item: Word;
  isCollected: boolean;
  onPress: () => void;
  textColor: string;
}) {
  const [active, setActive] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setActive(true)}
      onPressOut={() => setActive(false)}
      // @ts-ignore — onHoverIn/Out are valid in RN Web
      onHoverIn={() => setActive(true)}
      onHoverOut={() => setActive(false)}
      style={[styles.row, active && { backgroundColor: SURFACE }]}>
      <View style={[styles.rowBar, active && styles.rowBarActive]} />
      <View style={styles.wordMain}>
        <Text style={[styles.spanish, { color: textColor, fontFamily: Fonts.serif }]}>
          {item.spanish}
        </Text>
        <Text style={styles.gloss} numberOfLines={1}>
          <Text style={styles.glossChinese}>{item.chinese}</Text>
          {item.english ? (
            <Text style={styles.glossEnglish}>{'  '}{item.english}</Text>
          ) : null}
        </Text>
      </View>
      {isCollected && <View style={styles.dot} />}
    </Pressable>
  );
}

export default function WordsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState<Set<CEFRLevel>>(new Set());
  const [posSet, setPosSet] = useState<Set<PosOption>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [baseWords, setBaseWords] = useState<Word[]>([]);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [conjugMatch, setConjugMatch] = useState<ConjugMatchResult | null>(null);
  const [frequencySet, setFrequencySet] = useState<Set<Frequency>>(new Set());
  const [submittedLang, setSubmittedLang] = useState<'es' | 'zh' | 'en' | null>(null);

  useEffect(() => {
    let active = true;
    setSubmittedLang(null);
    searchWords(query).then((w) => { if (active) setBaseWords(w); });
    return () => { active = false; };
  }, [query]);

  useEffect(() => {
    if (query.length < 2) { setConjugMatch(null); return; }
    let active = true;
    const timer = setTimeout(async () => {
      const match = reverseConjugationLookup(query);
      if (!active || !match) { if (active) setConjugMatch(null); return; }
      const results = await searchWords(match.infinitive);
      const verb = results.find((w) => w.spanish.toLowerCase() === match.infinitive.toLowerCase());
      if (active) setConjugMatch(verb ? { ...match, wordId: verb.id } : null);
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      collectedWordIds().then((ids) => { if (active) setCollected(ids); });
      return () => { active = false; };
    }, []),
  );

  const words = useMemo(() => {
    let result = baseWords;
    if (levels.size > 0) result = result.filter((w) => levels.has(w.level));
    if (posSet.size > 0) {
      result = result.filter((w) => {
        if (posSet.has('other') && !MAIN_POS.includes(w.pos)) return true;
        return posSet.has(w.pos as PosOption);
      });
    }
    if (frequencySet.size > 0) {
      result = result.filter((w) => {
        const freq = getFrequency(w.spanish);
        return freq !== null && frequencySet.has(freq);
      });
    }
    return result;
  }, [baseWords, levels, posSet, frequencySet]);

  const toggleLevel = (lv: CEFRLevel) =>
    setLevels((prev) => { const s = new Set(prev); s.has(lv) ? s.delete(lv) : s.add(lv); return s; });

  const togglePos = (p: PosOption) =>
    setPosSet((prev) => { const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s; });

  const toggleFrequency = (f: Frequency) =>
    setFrequencySet((prev) => { const s = new Set(prev); s.has(f) ? s.delete(f) : s.add(f); return s; });

  const toggleDropdown = (id: Exclude<DropdownId, null>) =>
    setOpenDropdown((prev) => (prev === id ? null : id));

  const clearAll = () => { setLevels(new Set()); setPosSet(new Set()); setFrequencySet(new Set()); };

  const hasActiveFilter = levels.size > 0 || posSet.size > 0 || frequencySet.size > 0;

  const levelLabel = levels.size > 0
    ? `DELE ${[...levels].join('·')} ▾`
    : 'DELE 等级 ▾';

  const posLabel = posSet.size > 0
    ? `词性 · ${posSet.size} ▾`
    : '词性 ▾';

  const freqLabel = frequencySet.size > 0
    ? `频率 · ${frequencySet.size} ▾`
    : '频率 ▾';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>

        {/* Search bar — bottom line only */}
        <View style={[styles.searchWrap, { marginTop: WEB_TOP, borderBottomColor: theme.border }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="buscar · 搜索 · search"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={[styles.search, { color: theme.text }]}
          />
          {query.length > 0 && !submittedLang && (
            <ReportInline
              query={query}
              onSubmit={async (lang) => { await reportMissingWord(query, lang); setSubmittedLang(lang); }}
              accentColor={ACCENT}
              mutedColor={theme.textMuted}
            />
          )}
          {query.length > 0 && submittedLang && (
            <Text style={[styles.submittedBadge, { color: ACCENT }]}>✓</Text>
          )}
        </View>

        {/* Filter bar — text links, no button shells */}
        <View style={styles.filterRow}>
          <Pressable onPress={() => toggleDropdown('level')}>
            <Text style={[
              styles.filterLink,
              { color: levels.size > 0 ? ACCENT : theme.textMuted },
              levels.size > 0 && styles.filterLinkActive,
            ]}>
              {levelLabel}
            </Text>
          </Pressable>

          <Text style={[styles.filterSep, { color: theme.border }]}>·</Text>

          <Pressable onPress={() => toggleDropdown('pos')}>
            <Text style={[
              styles.filterLink,
              { color: posSet.size > 0 ? ACCENT : theme.textMuted },
              posSet.size > 0 && styles.filterLinkActive,
            ]}>
              {posLabel}
            </Text>
          </Pressable>

          <Text style={[styles.filterSep, { color: theme.border }]}>·</Text>

          <Text style={{color: theme.textMuted}}>样本不含频率评级</Text>

          <Text style={[styles.filterSep, { color: theme.border }]}>·</Text>

          <Pressable onPress={() => toggleDropdown('topic')}>
            <Text style={[styles.filterLink, { color: theme.textMuted }]}>专题 ▾</Text>
          </Pressable>

          {hasActiveFilter && (
            <Pressable onPress={clearAll} style={styles.clearBtn}>
              <Text style={[styles.clearText, { color: ACCENT }]}>清除</Text>
            </Pressable>
          )}
        </View>

        {/* Dropdown — DELE 等级 */}
        {openDropdown === 'level' && (
          <View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.optionGrid}>
              {CEFR_LEVELS.filter(lv => ['A1','A2','B1'].includes(lv)).map((lv) => (
                <Pressable
                  key={lv}
                  onPress={() => toggleLevel(lv)}
                  style={[styles.optionChip, levels.has(lv) && { backgroundColor: ACCENT_DIM }]}>
                  <Text style={[
                    styles.optionText,
                    { color: levels.has(lv) ? ACCENT : theme.textSecondary },
                    levels.has(lv) && styles.optionTextActive,
                  ]}>
                    {lv}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Dropdown — 词性 */}
        {openDropdown === 'pos' && (
          <View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.optionGrid}>
              {POS_OPTIONS.map(({ label, value }) => (
                <Pressable
                  key={value}
                  onPress={() => togglePos(value)}
                  style={[styles.optionChip, posSet.has(value) && { backgroundColor: ACCENT_DIM }]}>
                  <Text style={[
                    styles.optionText,
                    { color: posSet.has(value) ? ACCENT : theme.textSecondary },
                    posSet.has(value) && styles.optionTextActive,
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Dropdown — 频率 */}
        {openDropdown === 'frequency' && (
          <View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.optionGrid}>
              {([['高频', 'high'], ['中频', 'mid'], ['低频', 'low']] as [string, Frequency][]).map(([label, value]) => (
                <Pressable
                  key={value}
                  onPress={() => toggleFrequency(value)}
                  style={[styles.optionChip, frequencySet.has(value) && { backgroundColor: ACCENT_DIM }]}>
                  <Text style={[
                    styles.optionText,
                    { color: frequencySet.has(value) ? ACCENT : theme.textSecondary },
                    frequencySet.has(value) && styles.optionTextActive,
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Dropdown — 专题 */}
        {openDropdown === 'topic' && (
          <View style={[styles.dropdown, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Pressable
              onPress={() => { router.push('/conjugation/rules'); setOpenDropdown(null); }}
              style={({ pressed }) => [styles.topicRow, pressed && styles.pressed]}>
              <ThemedText type="small">📖 动词变位规则</ThemedText>
              <Text style={[styles.topicArrow, { color: theme.textMuted }]}>→</Text>
            </Pressable>
            {TOPICS.map((t) => (
              <Pressable
                key={t.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPress={() => { router.push(`/topic/${t.id}` as any); setOpenDropdown(null); }}
                style={({ pressed }) => [styles.topicRow, pressed && styles.pressed]}>
                <ThemedText type="small">📚 {t.title}</ThemedText>
                <Text style={[styles.topicArrow, { color: theme.textMuted }]}>→</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!query.trim() && <Text style={{paddingHorizontal:16,paddingVertical:8,color:theme.textMuted}}>试试 cocina · kitchen · 厨房</Text>}
        <FlatList
          data={words}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setOpenDropdown(null)}
          ListHeaderComponent={
            conjugMatch ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/word/[id]',
                    params: { id: conjugMatch.wordId, conjugBanner: conjugMatch.banner },
                  })
                }
                style={({ pressed }) => [styles.row, styles.conjugRow, pressed && { backgroundColor: SURFACE }]}>
                <View style={[styles.rowBar, styles.rowBarActive]} />
                <View style={styles.wordMain}>
                  <Text style={[styles.spanish, { color: theme.text, fontFamily: Fonts.serif }]}>
                    {conjugMatch.infinitive}
                  </Text>
                  <Text style={styles.gloss}>
                    <Text style={styles.glossChinese}>{conjugMatch.banner}</Text>
                  </Text>
                </View>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            query.length > 0 && !conjugMatch ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.empty, { color: theme.textMuted }]}>
                  没有匹配「{query}」的词。
                </Text>
                {submittedLang ? (
                  <Text style={[styles.emptyHint, { color: ACCENT }]}>
                    已提交（{submittedLang === 'es' ? '西语' : submittedLang === 'zh' ? '中文' : 'English'}）✓
                  </Text>
                ) : (
                  <View style={styles.langRow}>
                    <Text style={[styles.emptyHint, { color: theme.textMuted }]}>这个词是：</Text>
                    {(['es', 'zh', 'en'] as MissingLang[]).map((lang) => (
                      <Pressable
                        key={lang}
                        onPress={async () => { await reportMissingWord(query, lang); setSubmittedLang(lang); }}
                        style={[styles.langBtn, { borderColor: ACCENT }]}>
                        <Text style={[styles.langBtnText, { color: ACCENT }]}>
                          {lang === 'es' ? '西语' : lang === 'zh' ? '中文' : 'English'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <WordRow
              item={item}
              isCollected={collected.has(item.id)}
              onPress={() => { setOpenDropdown(null); router.push(`/word/${item.id}`); }}
              textColor={theme.text}
            />
          )}
        />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  centered: { flex: 1, width: '100%', maxWidth: MaxContentWidth },

  /* ── Search ── */
  searchWrap: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  search: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    // @ts-ignore — web only
    outlineWidth: 0,
  },
  reportToggle: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  reportToggleText: {
    fontSize: 12,
  },
  reportPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportLangBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reportLangText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submittedBadge: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: Spacing.two,
  },

  /* ── Filters ── */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  filterLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterLinkActive: {
    fontWeight: '600',
  },
  filterSep: {
    fontSize: 13,
  },
  clearBtn: {
    marginLeft: 'auto',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* ── Dropdown ── */
  dropdown: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
  },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  optionChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionTextActive: {
    fontWeight: '600',
  },
  topicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  topicArrow: {
    fontSize: 14,
  },

  /* ── List rows ── */
  list: {
    paddingBottom: Spacing.sixteen,
  },
  conjugRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D8D2C8',
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingRight: Spacing.four,
  },
  rowBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    marginRight: Spacing.three,
  },
  rowBarActive: {
    backgroundColor: ACCENT,
  },
  wordMain: {
    flex: 1,
    gap: 3,
  },
  spanish: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  gloss: {
    fontSize: 14,
    lineHeight: 19,
  },
  glossChinese: {
    color: '#1A1A1A',
    fontWeight: '400',
  },
  glossEnglish: {
    color: '#888888',
    fontWeight: '300',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
    marginLeft: Spacing.two,
  },
  pressed: { opacity: 0.6 },
  empty: {
    textAlign: 'center',
    paddingTop: Spacing.six,
    fontSize: 14,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyHint: {
    fontSize: 13,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  langBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
