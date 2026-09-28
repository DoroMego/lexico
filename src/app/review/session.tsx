import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { dueCards, recordReview } from '@/lib/db';
import { localDay } from '@/lib/date';
import { CollectionItem, Familiarity, Word } from '@/lib/types';

const GRADES: { label: string; value: Familiarity }[] = [
  { label: '完全不熟', value: Familiarity.Unknown },
  { label: '有点印象', value: Familiarity.Vague },
  { label: '比较熟', value: Familiarity.Familiar },
  { label: '已掌握', value: Familiarity.Mastered },
];

type Card = { word: Word; item: CollectionItem };

export default function ReviewSessionScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    dueCards(Date.now()).then(setCards);
  }, []);

  const onGrade = useCallback(
    async (grade: Familiarity) => {
      if (!cards) return;
      const card = cards[index];
      await recordReview(card.item, 'es-to-zh', grade, Date.now(), localDay());
      setDone((d) => d + 1);
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [cards, index],
  );

  // Loading
  if (!cards) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="small" themeColor="textSecondary">
          加载中…
        </ThemedText>
      </ThemedView>
    );
  }

  // Nothing due, or finished the queue → summary
  if (cards.length === 0 || index >= cards.length) {
    const msg = cards.length === 0 ? '今天没有要复习的了 🎉' : `复习完成！本轮 ${done} 个 🎉`;
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="title" style={styles.summaryText}>
          {msg}
        </ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedView type="backgroundElement" style={styles.gradeBtn}>
            <ThemedText type="smallBold">返回</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    );
  }

  const card = cards[index];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.progress}>
          {index + 1} / {cards.length}
        </ThemedText>

        <Pressable style={styles.card} onPress={() => setFlipped(true)}>
          <ThemedView type="backgroundElement" style={styles.cardInner}>
            <ThemedText type="title">{card.word.spanish}</ThemedText>
            {flipped && (
              <View style={styles.answer}>
                <ThemedText type="subtitle">
                  {card.word.chinese} · {card.word.english}
                </ThemedText>
                {card.word.exampleEs && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.example}>
                    {card.word.exampleEs}
                  </ThemedText>
                )}
              </View>
            )}
          </ThemedView>
        </Pressable>

        {flipped ? (
          <View style={styles.grades}>
            {GRADES.map((g) => (
              <Pressable key={g.value} onPress={() => onGrade(g.value)} style={styles.gradeFlex}>
                <ThemedView type="backgroundElement" style={styles.gradeBtn}>
                  <ThemedText type="smallBold">{g.label}</ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable onPress={() => setFlipped(true)}>
            <ThemedView type="backgroundElement" style={styles.gradeBtn}>
              <ThemedText type="smallBold">显示答案</ThemedText>
            </ThemedView>
          </Pressable>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', flex: 1, padding: Spacing.four, gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.four, padding: Spacing.four },
  summaryText: { textAlign: 'center' },
  progress: { textAlign: 'center' },
  card: { flex: 1 },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  answer: { alignItems: 'center', gap: Spacing.two },
  example: { textAlign: 'center' },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gradeFlex: { flexGrow: 1, flexBasis: '48%' },
  gradeBtn: { padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
