import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { type GuideCategory, GUIDE_CATEGORIES } from '@/data/guide';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#C8793A';
const SURFACE = '#F0EDE8';
const SURFACE_PRESS = '#E8E3DC';
const WEB_TOP = Platform.OS === 'web' ? 52 : 0;

function GuideCard({ cat, onPress }: { cat: GuideCategory; onPress: () => void }) {
  const [active, setActive] = useState(false);
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setActive(true)}
      onPressOut={() => setActive(false)}
      // @ts-ignore — onHoverIn/Out valid in RN Web
      onHoverIn={() => setActive(true)}
      onHoverOut={() => setActive(false)}
      style={styles.cardWrap}>
      <View style={[styles.card, active && { backgroundColor: SURFACE_PRESS }]}>
        <View style={styles.cardBar} />
        <View style={styles.cardBody}>
          <Text style={[styles.titleEs, { fontFamily: Fonts.serif }]}>{cat.titleEs}</Text>
          <Text style={[styles.titleZh, { color: theme.text }]}>{cat.titleZh}</Text>
          <Text style={[styles.summary, { color: theme.textMuted }]} numberOfLines={2}>
            {cat.summary}
          </Text>
          <Text style={[styles.topicCount, { color: theme.textMuted }]}>
            {cat.topics.length} 个专题
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function GuideScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: WEB_TOP + Spacing.six },
          ]}>
          <View style={[styles.inner, { maxWidth: MaxContentWidth }]}>

            {/* Hero header */}
            <View style={styles.hero}>
              <Text style={[styles.heroTitle, { color: theme.text, fontFamily: Fonts.serif }]}>
                語法指南
              </Text>
              <Text style={[styles.heroSub, { fontFamily: Fonts.serif }]}>
                Guía Gramatical
              </Text>
            </View>

            {/* Card grid */}
            <View style={styles.grid}>
              {GUIDE_CATEGORIES.map((cat) => (
                <GuideCard
                  key={cat.id}
                  cat={cat}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onPress={() => router.push(`/guide/${cat.id}` as any)}
                />
              ))}
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingBottom: Spacing.sixteen,
  },
  inner: {
    width: '100%',
    paddingHorizontal: Spacing.four,
  },

  /* ── Hero ── */
  hero: {
    marginBottom: Spacing.eight,
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  heroSub: {
    fontSize: 16,
    fontStyle: 'italic',
    color: ACCENT,
    fontWeight: '400',
  },

  /* ── Grid ── */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.five,
  },
  cardWrap: {
    width: '47%',
    flexGrow: 1,
    minWidth: 150,
  },

  /* ── Card ── */
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: Radius.md,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  cardBar: {
    width: 3,
    backgroundColor: ACCENT,
  },
  cardBody: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  titleEs: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.8,
    marginBottom: Spacing.one,
  },
  titleZh: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.two,
  },
  topicCount: {
    fontSize: 11,
    marginTop: Spacing.two,
    letterSpacing: 0.3,
  },
});
