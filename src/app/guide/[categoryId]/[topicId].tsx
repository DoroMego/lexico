import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FamiliarityPicker } from '@/components/familiarity-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getCategoryById } from '@/data/guide';
import { collectWord, isCollected, searchWords } from '@/lib/db';
import { Familiarity, Word } from '@/lib/types';

function useWordLookup(spanishList: string[] | undefined) {
  const [words, setWords] = useState<Map<string, Word>>(new Map());

  useEffect(() => {
    if (!spanishList || spanishList.length === 0) return;
    let active = true;
    Promise.all(spanishList.map((s) => searchWords(s))).then((results) => {
      if (!active) return;
      const map = new Map<string, Word>();
      results.forEach((res, i) => {
        const key = spanishList[i].toLowerCase();
        const match = res.find((w) => w.spanish.toLowerCase() === key);
        if (match) map.set(key, match);
      });
      setWords(map);
    });
    return () => { active = false; };
  }, [spanishList]);

  return words;
}

function ExampleWordChip({
  spanish,
  word,
}: {
  spanish: string;
  word: Word | undefined;
}) {
  const router = useRouter();
  const [collected, setCollected] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!word) return;
    isCollected(word.id).then(setCollected);
  }, [word]);

  const onCollect = useCallback(
    async (fam: Familiarity) => {
      if (!word) return;
      await collectWord(word.id, fam, Date.now());
      setCollected(true);
      setPicking(false);
    },
    [word],
  );

  return (
    <>
      <View style={styles.chip}>
        <Pressable
          style={({ pressed }) => pressed && styles.pressed}
          onPress={() => word && router.push(`/word/${word.id}` as any)}>
          <ThemedText type="smallBold" style={styles.chipWord}>
            {spanish}
          </ThemedText>
        </Pressable>
        {word && (
          <Pressable
            onPress={() => { if (!collected) setPicking(true); }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText
              type="small"
              style={collected ? styles.chipCollected : styles.chipAdd}>
              {collected ? '✓' : '+'}
            </ThemedText>
          </Pressable>
        )}
      </View>
      {picking && (
        <FamiliarityPicker
          visible
          word={spanish}
          onPick={onCollect}
          onCancel={() => setPicking(false)}
        />
      )}
    </>
  );
}

export default function GuideTopicScreen() {
  const { categoryId, topicId } = useLocalSearchParams<{ categoryId: string; topicId: string }>();
  const category = getCategoryById(categoryId ?? '');
  const topic = category?.topics.find((t) => t.id === topicId);
  const wordMap = useWordLookup(topic?.exampleWords);

  if (!category || !topic) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="small" themeColor="textSecondary">未找到专题</ThemedText>
      </ThemedView>
    );
  }

  const paragraphs = topic.content.split('\n\n');

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { borderLeftColor: category.accent }]}>
          <ThemedText type="small" style={{ color: category.accent }}>
            {category.titleZh} · {category.titleEs}
          </ThemedText>
          <ThemedText type="title">{topic.title}</ThemedText>
        </View>

        {/* Content */}
        <ThemedView type="backgroundElement" style={styles.contentCard}>
          {paragraphs.map((para, i) => (
            <View key={i} style={i > 0 ? styles.paraGap : undefined}>
              {para.split('\n').map((line, j) => (
                <ThemedText key={j} type="small" style={styles.contentLine}>
                  {line}
                </ThemedText>
              ))}
            </View>
          ))}
        </ThemedView>

        {/* Example words */}
        {topic.exampleWords && topic.exampleWords.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              例词
            </ThemedText>
            <View style={styles.chipRow}>
              {topic.exampleWords.map((w) => (
                <ExampleWordChip key={w} spanish={w} word={wordMap.get(w.toLowerCase())} />
              ))}
            </View>
          </View>
        )}

        {/* Example sentences */}
        {topic.exampleSentences && topic.exampleSentences.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              例句
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.sentenceList}>
              {topic.exampleSentences.map((s, i) => (
                <View key={i}>
                  {i > 0 && <View style={styles.separator} />}
                  <View style={styles.sentenceRow}>
                    <ThemedText type="small" style={styles.sentenceEs}>{s.es}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{s.zh}</ThemedText>
                  </View>
                </View>
              ))}
            </ThemedView>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  header: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.three,
    gap: Spacing.one,
  },
  contentCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  paraGap: { marginTop: Spacing.three },
  contentLine: { lineHeight: 22 },
  section: { gap: Spacing.two },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  chipWord: {},
  chipAdd: { color: '#2F80ED' },
  chipCollected: { color: '#27AE60' },
  sentenceList: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  sentenceRow: {
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  sentenceEs: { fontStyle: 'italic' },
  pressed: { opacity: 0.5 },
});
