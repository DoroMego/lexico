import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  type Conjugation,
  type Mood,
  PERSONS,
  PERSON_LABELS,
  TENSES,
} from '@/lib/conjugation';

const MOOD_ORDER: { mood: Mood; label: string }[] = [
  { mood: 'indicativo', label: '直陈式 Indicativo' },
  { mood: 'subjuntivo', label: '虚拟式 Subjuntivo' },
  { mood: 'imperativo', label: '命令式 Imperativo' },
];

export function ConjugationTable({
  conjugation,
  alwaysShowForms = false,
}: {
  conjugation: Conjugation;
  alwaysShowForms?: boolean;
}) {
  return (
    <View style={styles.root}>
      <ThemedView type="backgroundElement" style={styles.nonFinite}>
        <NonFinite label="副动词 gerundio" cell={conjugation.gerundio} />
        <NonFinite label="过去分词 participio" cell={conjugation.participio} />
      </ThemedView>

      {MOOD_ORDER.map(({ mood, label }) => (
        <View key={mood} style={styles.moodSection}>
          <ThemedText type="subtitle" style={styles.moodHeading}>
            {label}
          </ThemedText>
          {TENSES.filter((t) => t.mood === mood).map((meta) => {
            const cells = conjugation.tenses[meta.tense];
            return (
              <ThemedView key={meta.tense} type="backgroundElement" style={styles.tenseCard}>
                <ThemedText type="smallBold">
                  {meta.zh} · {meta.es}
                </ThemedText>
                <View style={styles.grid}>
                  {PERSONS.filter((p) => cells[p]).map((p) => {
                    const cell = cells[p]!;
                    return (
                      <View key={p} style={styles.cell}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {PERSON_LABELS[p]}
                        </ThemedText>
                        <ThemedText
                          type={cell.regular && !alwaysShowForms ? 'small' : 'smallBold'}
                          style={cell.regular && !alwaysShowForms ? styles.regular : undefined}>
                          {cell.form}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </ThemedView>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function NonFinite({ label, cell }: { label: string; cell: Conjugation['gerundio'] }) {
  return (
    <View style={styles.cell}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{cell.form}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.four },
  nonFinite: {
    flexDirection: 'row',
    gap: Spacing.four,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  moodSection: { gap: Spacing.two },
  moodHeading: { marginTop: Spacing.two },
  tenseCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', paddingVertical: Spacing.one, gap: Spacing.half },
  // Blue so the "regular" cells stand out from the black irregular forms.
  regular: { fontStyle: 'italic', color: '#2F80ED' },
});
