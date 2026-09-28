import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { checkinCount, dueCount } from '@/lib/db';
import { localDay } from '@/lib/date';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#C8793A';
const SURFACE = '#F0EDE8';

export default function ReviewScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [due, setDue] = useState<number | null>(null);
  const [today, setToday] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([dueCount(Date.now()), checkinCount(localDay())]).then(([d, t]) => {
        if (active) { setDue(d); setToday(t); }
      });
      return () => { active = false; };
    }, []),
  );

  const loading = due === null;
  const hasDue = (due ?? 0) > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView
        style={[styles.safeArea, Platform.OS === 'web' && { paddingTop: 52 }]}
        edges={['top']}>
        <View style={[styles.centered, { maxWidth: MaxContentWidth }]}>

          {/* Stats card */}
          <View style={[styles.statsCard, { backgroundColor: SURFACE }]}>
            <View style={styles.statsBar} />
            <View style={styles.statsBody}>
              <Text style={[styles.dueCount, { color: theme.text }]}>
                {loading ? '—' : due}
              </Text>
              <Text style={[styles.dueLabel, { color: theme.textMuted }]}>
                个待复习 · pendientes
              </Text>
              <Text style={[styles.todayLabel, { color: theme.textMuted }]}>
                今天已复习 {today} 个
              </Text>
            </View>
          </View>

          {/* Start button */}
          {hasDue ? (
            <Pressable
              onPress={() => router.push('/review/session')}
              style={({ pressed }) => [styles.btnStart, pressed && styles.pressed]}>
              <Text style={styles.btnStartText}>开始复习 →</Text>
            </Pressable>
          ) : (
            <Text style={[styles.noDue, { color: theme.textMuted }]}>
              {loading ? '' : '暂无待复习'}
            </Text>
          )}

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            在「单词」里收藏单词后，会按艾宾浩斯遗忘曲线安排复习。
          </Text>

        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: {
    width: '100%',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    alignItems: 'center',
  },

  /* ── Stats card ── */
  statsCard: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  statsBar: { width: 4, backgroundColor: ACCENT },
  statsBody: {
    flex: 1,
    padding: Spacing.five,
    gap: Spacing.one,
    alignItems: 'center',
  },
  dueCount: {
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 68,
  },
  dueLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  todayLabel: {
    fontSize: 12,
    marginTop: Spacing.two,
  },

  /* ── Buttons ── */
  btnStart: {
    backgroundColor: ACCENT,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.eight,
    borderRadius: Radius.sm,
  },
  btnStartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noDue: {
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.two,
  },

  pressed: { opacity: 0.75 },
});
