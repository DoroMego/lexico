import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FamiliarityPicker } from '@/components/familiarity-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { collectWord, collectedWordIds, listWords } from '@/lib/db';
import { CEFR_LEVELS, CEFRLevel, Familiarity, Word } from '@/lib/types';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#C8793A';
const SURFACE = '#F0EDE8';

export default function NewWordsScreen() {
  const theme = useTheme();
  const [level, setLevel] = useState<CEFRLevel | null>(null);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [current, setCurrent] = useState<Word | null>(null);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [isAdded, setIsAdded] = useState(false);
  const [history, setHistory] = useState<Word[]>([]);
  const [picking, setPicking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([listWords(), collectedWordIds()]).then(([words, ids]) => {
        if (!active) return;
        setCollected(ids);
        setHistory([]);
        const filtered = level ? words.filter(w => w.level === level) : words;
        setAllWords(filtered);
        if (filtered.length > 0) {
          const idx = Math.floor(Math.random() * filtered.length);
          setCurrent(filtered[idx]);
          setIsAdded(ids.has(filtered[idx].id));
        }
      });
      return () => { active = false; };
    }, [level]),
  );

  const handleNext = () => {
    if (allWords.length === 0) return;
    if (current) setHistory(prev => [...prev, current]);
    const idx = Math.floor(Math.random() * allWords.length);
    setCurrent(allWords[idx]);
    setIsAdded(collected.has(allWords[idx].id));
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrent(prev);
    setIsAdded(collected.has(prev.id));
  };

  const handleAddToCollection = () => {
    if (!current || isAdded) return;
    setPicking(true);
  };

  const handlePickFamiliarity = async (fam: Familiarity) => {
    if (!current) return;
    try {
      await collectWord(current.id, fam, Date.now());
      setIsAdded(true);
      setTimeout(handleNext, 300);
    } catch (e) {
      console.error('[collect]', e);
    } finally {
      setPicking(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView
        style={[styles.safeArea, Platform.OS === 'web' && { paddingTop: 52 }]}
        edges={['top']}>

        {/* Level filter — underline tab */}
        <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
          {([null, ...CEFR_LEVELS.filter(lv => ['A1','A2','B1'].includes(lv))] as (CEFRLevel | null)[]).map((lv) => {
            const active = level === lv;
            return (
              <Pressable
                key={lv ?? 'all'}
                onPress={() => setLevel(lv)}
                style={[styles.tab, active && styles.tabActive]}>
                <Text style={[styles.tabText, { color: active ? ACCENT : theme.textMuted }]}>
                  {lv ?? '全部'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {current ? (
          <View style={styles.cardContainer}>

            {/* Word card */}
            <View style={[styles.card, { shadowColor: theme.text }]}>
              <View style={styles.accentBar} />

              <View style={styles.cardContent}>
                {/* Spanish headword — serif bold */}
                <Text style={[styles.spanish, { color: theme.text, fontFamily: Fonts.serif }]}>
                  {current.spanish}
                </Text>

                {/* POS — small caps, accent */}
                <Text style={styles.pos}>
                  {[current.gender ? `[${current.gender}]` : '', current.pos]
                    .filter(Boolean).join('  ').toUpperCase()}
                </Text>

                {/* Meanings */}
                <View style={styles.meanings}>
                  <Text style={[styles.english, { color: theme.textMuted }]}>
                    {current.english}
                  </Text>
                  <Text style={[styles.chinese, { color: theme.text }]}>
                    {current.chinese}
                  </Text>
                </View>

                {/* Example */}
                {current.exampleEs && (
                  <View style={[styles.example, { borderTopColor: theme.border }]}>
                    <Text style={[styles.exampleEs, { color: theme.textSecondary }]}>
                      {current.exampleEs}
                    </Text>
                    <Text style={[styles.exampleZh, { color: theme.textMuted }]}>
                      {current.exampleZh}
                    </Text>
                  </View>
                )}

                {/* Footer: level badge */}
                <Text style={[styles.levelBadge, { color: theme.textMuted, marginTop: Spacing.two }]}>
                  {current.level}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.buttonRow}>
              {history.length > 0 && (
                <Pressable
                  onPress={handleBack}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <Text style={[styles.btnTextLink, { color: theme.textMuted }]}>
                    ← 上一个
                  </Text>
                </Pressable>
              )}

              <View style={styles.btnRight}>
                <Pressable
                  onPress={handleAddToCollection}
                  disabled={isAdded}
                  style={({ pressed }) => [
                    styles.btnAdd,
                    isAdded && styles.btnAddDone,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.btnAddText, isAdded && { color: theme.textMuted }]}>
                    {isAdded ? '✓ 已添加' : '+ 加到积累'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleNext}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <Text style={[styles.btnTextLink, { color: theme.text }]}>
                    下一个 →
                  </Text>
                </Pressable>
              </View>
            </View>

          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText type="subtitle" themeColor="textSecondary">暂无词汇</ThemedText>
          </View>
        )}

        <Text style={[styles.counter, { color: theme.textMuted }]}>
          {allWords.length} 个词汇
        </Text>
      </SafeAreaView>

      <FamiliarityPicker
        visible={picking}
        word={current?.spanish}
        onPick={handlePickFamiliarity}
        onCancel={() => setPicking(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  /* ── Tab filter ── */
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    marginBottom: Spacing.four,
  },
  tab: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: -1,          // overlap the row's bottom border
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: ACCENT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  /* ── Card ── */
  cardContainer: {
    flex: 1,
    justifyContent: 'space-between',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: Spacing.four,
  },
  accentBar: {
    width: 4,
    backgroundColor: ACCENT,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.five,
  },

  /* ── Word content ── */
  spanish: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
    marginBottom: Spacing.two,
  },
  pos: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: ACCENT,
    marginBottom: Spacing.four,
  },
  meanings: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  english: {
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 22,
  },
  chinese: {
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 30,
  },
  example: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  exampleEs: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  exampleZh: {
    fontSize: 13,
    lineHeight: 18,
  },
  levelBadge: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },

  /* ── Buttons ── */
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  btnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginLeft: 'auto',
  },
  btnTextLink: {
    fontSize: 15,
    fontWeight: '500',
  },
  btnAdd: {
    backgroundColor: ACCENT,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.sm,
  },
  btnAddDone: {
    backgroundColor: SURFACE,
  },
  btnAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },

  /* ── Misc ── */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: Spacing.four,
  },
});
