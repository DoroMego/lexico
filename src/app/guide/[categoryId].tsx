import { GUIDE_CATEGORIES } from '@/data/guide';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getCategoryById } from '@/data/guide';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#C8793A';
const SURFACE = '#F0EDE8';
const SURFACE_PRESS = '#E8E3DC';

function TopicRow({ title, summary, onPress }: {
  title: string; summary: string; onPress: () => void;
}) {
  const [active, setActive] = useState(false);
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setActive(true)}
      onPressOut={() => setActive(false)}
      // @ts-ignore
      onHoverIn={() => setActive(true)}
      onHoverOut={() => setActive(false)}
      style={[styles.row, active && { backgroundColor: SURFACE_PRESS }]}>
      <View style={[styles.rowBar, active && styles.rowBarActive]} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.rowSummary, { color: theme.textMuted }]}>{summary}</Text>
      </View>
      <Text style={[styles.rowArrow, { color: theme.textMuted }]}>›</Text>
    </Pressable>
  );
}

export default function GuideCategoryScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const category = getCategoryById(categoryId ?? '');

  if (!category) {
    return (
      <ThemedView style={styles.center}>
        <Text style={[styles.rowSummary, { color: theme.textMuted }]}>未找到分类</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.inner, { maxWidth: MaxContentWidth }]}>

          {/* Category header */}
          <View style={styles.header}>
            <View style={styles.headerBar} />
            <View style={styles.headerBody}>
              <Text style={[styles.headerEs, { fontFamily: Fonts.serif }]}>
                {category.titleEs}
              </Text>
              <Text style={[styles.headerZh, { color: theme.text }]}>
                {category.titleZh}
              </Text>
              <Text style={[styles.headerSummary, { color: theme.textMuted }]}>
                {category.summary}
              </Text>
            </View>
          </View>

          {/* Topic list */}
          <View style={[styles.list, { backgroundColor: SURFACE }]}>
            {category.topics.map((topic) => (
              <TopicRow
                key={topic.id}
                title={topic.title}
                summary={topic.summary}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPress={() => router.push(`/guide/${categoryId}/${topic.id}` as any)}
              />
            ))}
          </View>

        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', paddingBottom: Spacing.sixteen },
  inner: {
    width: '100%',
    padding: Spacing.four,
    gap: Spacing.five,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  headerBar: {
    width: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  headerBody: { flex: 1, gap: Spacing.one },
  headerEs: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.6,
  },
  headerZh: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  headerSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.one,
  },

  /* ── Topic list ── */
  list: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingRight: Spacing.four,
    backgroundColor: SURFACE,
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
  rowBody: { flex: 1, gap: 3 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  rowSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  rowArrow: {
    fontSize: 18,
    marginLeft: Spacing.two,
  },
});

export function generateStaticParams() {
 return GUIDE_CATEGORIES.map(category => ({ categoryId: category.id }));
}
