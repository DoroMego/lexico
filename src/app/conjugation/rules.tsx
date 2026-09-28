import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  CONDICIONAL_ENDINGS,
  type Endings,
  FUTURO_ENDINGS,
  type Group,
  IMPERATIVO_AFIRM_ENDINGS,
  NONFINITE_SUFFIXES,
  PERSONS,
  REGULAR_ENDINGS,
} from '@/lib/conjugation';

const ACCENT = '#C8793A';
const SURFACE = '#F0EDE8';

const GROUPS: Group[] = ['ar', 'er', 'ir'];

const STEM_TENSES: { key: keyof typeof REGULAR_ENDINGS; zh: string; es: string }[] = [
  { key: 'presente',            zh: '直陈式现在时',       es: 'Presente' },
  { key: 'preteritoImperfecto', zh: '过去未完成时',       es: 'Pretérito imperfecto' },
  { key: 'preteritoIndefinido', zh: '简单过去时',         es: 'Pretérito indefinido' },
  { key: 'presenteSubj',        zh: '虚拟式现在时',       es: 'Subjuntivo presente' },
  { key: 'imperfectoSubj',      zh: '虚拟式过去未完成时', es: 'Subjuntivo imperfecto (-ra)' },
];

function endingLine(group: Group, endings: Partial<Endings>): string {
  return `-${group}: ${PERSONS.map((p) => endings[p] ?? '—').join(' · ')}`;
}

function Card({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.cardBar} />
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function EndingsBlock({ zh, es, endingsByGroup }: {
  zh: string; es: string; endingsByGroup: Record<Group, Partial<Endings>>;
}) {
  const theme = useTheme();
  return (
    <Card>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{zh}</Text>
      <Text style={[styles.cardTitleEs, { color: ACCENT }]}>{es}</Text>
      {GROUPS.map((g) => (
        <Text key={g} style={[styles.mono, { color: theme.textSecondary }]}>
          {endingLine(g, endingsByGroup[g])}
        </Text>
      ))}
    </Card>
  );
}

export default function ConjugationRulesScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.inner, { maxWidth: MaxContentWidth }]}>

          <Text style={[styles.personOrder, { color: theme.textMuted }]}>
            人称顺序：yo · tú · él/ella/Ud. · nosotros · vosotros · ellos/Uds.
          </Text>

          {STEM_TENSES.map((t) => (
            <EndingsBlock
              key={t.key}
              zh={t.zh}
              es={t.es}
              endingsByGroup={REGULAR_ENDINGS[t.key]}
            />
          ))}

          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              简单将来时 / 条件式
            </Text>
            <Text style={[styles.cardTitleEs, { color: ACCENT }]}>
              Futuro / Condicional
            </Text>
            <Text style={[styles.cardNote, { color: theme.textMuted }]}>
              加在「原形」后，三类相同
            </Text>
            <Text style={[styles.mono, { color: theme.textSecondary }]}>
              将来：{PERSONS.map((p) => FUTURO_ENDINGS[p]).join(' · ')}
            </Text>
            <Text style={[styles.mono, { color: theme.textSecondary }]}>
              条件：{PERSONS.map((p) => CONDICIONAL_ENDINGS[p]).join(' · ')}
            </Text>
          </Card>

          <EndingsBlock
            zh="肯定命令式"
            es="Imperativo afirmativo"
            endingsByGroup={IMPERATIVO_AFIRM_ENDINGS}
          />

          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>副动词 / 过去分词</Text>
            <Text style={[styles.cardTitleEs, { color: ACCENT }]}>Gerundio / Participio</Text>
            <Text style={[styles.mono, { color: theme.textSecondary }]}>
              副动词：-ar→{NONFINITE_SUFFIXES.gerundio.ar} / -er·-ir→{NONFINITE_SUFFIXES.gerundio.er}
            </Text>
            <Text style={[styles.mono, { color: theme.textSecondary }]}>
              过去分词：-ar→{NONFINITE_SUFFIXES.participio.ar} / -er·-ir→{NONFINITE_SUFFIXES.participio.er}
            </Text>
          </Card>

          <Card>
            <Text style={[styles.cardTitle, { color: theme.text }]}>复合时态</Text>
            <Text style={[styles.cardTitleEs, { color: ACCENT }]}>Tiempos compuestos</Text>
            <Text style={[styles.cardNote, { color: theme.textMuted }]}>
              完成时 = haber（对应时态）+ 过去分词；现在进行时 = estar（现在时）+ 副动词
            </Text>
          </Card>

        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: 'center', paddingBottom: Spacing.sixteen },
  inner: {
    width: '100%',
    padding: Spacing.four,
    gap: Spacing.three,
  },

  personOrder: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.one,
  },

  /* ── Card ── */
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardBar: { width: 3, backgroundColor: ACCENT },
  cardBody: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardTitleEs: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginTop: -Spacing.one,
    marginBottom: Spacing.one,
  },
  cardNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  mono: {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 20,
  },
});
