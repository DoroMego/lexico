import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { FamiliarityPicker } from '@/components/familiarity-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getTopicById } from '@/data/topics';
import { searchWords, collectedWordIds, collectWord } from '@/lib/db';
import { Familiarity, Word } from '@/lib/types';

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const topic = getTopicById(id);
  const [words, setWords] = useState<Word[]>([]);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [picking, setPicking] = useState<Word | null>(null);

  useEffect(() => {
    if (!topic) return;
    // Load words in topic order
    searchWords('').then((all) => {
      const bySpanish = new Map(all.map((w) => [w.spanish.toLowerCase(), w]));
      const ordered = topic.words
        .map((s) => bySpanish.get(s.toLowerCase()))
        .filter((w): w is Word => w !== undefined);
      setWords(ordered);
    });
  }, [topic]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      collectedWordIds().then((ids) => { if (active) setCollected(ids); });
      return () => { active = false; };
    }, []),
  );

  const handleCollect = (word: Word) => {
    if (collected.has(word.id)) {
      router.push(`/word/${word.id}`);
    } else {
      setPicking(word);
    }
  };

  const handlePickFamiliarity = async (fam: Familiarity) => {
    if (!picking) return;
    try {
      await collectWord(picking.id, fam, Date.now());
      setCollected((prev) => new Set(prev).add(picking.id));
    } catch (e) {
      console.error('[topic] collect error', e);
    } finally {
      setPicking(null);
    }
  };

  if (!topic) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="small" themeColor="textSecondary">专题不存在</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: topic.title, headerBackTitle: '返回' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={words}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
              {topic.description}
            </ThemedText>
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
          )}
          renderItem={({ item, index }) => {
            const isCollected = collected.has(item.id);
            return (
              <Pressable
                onPress={() => router.push(`/word/${item.id}`)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.index}>
                  {index + 1}
                </ThemedText>
                <View style={styles.wordMain}>
                  <ThemedText type="default">{item.spanish}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.chinese} · {item.english}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); handleCollect(item); }}
                  style={styles.collectBtn}>
                  <ThemedView
                    type={isCollected ? 'backgroundElement' : 'backgroundSelected'}
                    style={styles.collectInner}>
                    <ThemedText
                      type="small"
                      themeColor={isCollected ? 'textSecondary' : 'text'}>
                      {isCollected ? '✓' : '+'}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>

      <FamiliarityPicker
        visible={!!picking}
        word={picking?.spanish}
        onPick={handlePickFamiliarity}
        onCancel={() => setPicking(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  desc: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  list: { paddingBottom: Spacing.six },
  separator: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  pressed: { opacity: 0.5 },
  index: { width: 24, textAlign: 'right', flexShrink: 0 },
  wordMain: { flex: 1, gap: Spacing.half },
  collectBtn: { flexShrink: 0 },
  collectInner: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
