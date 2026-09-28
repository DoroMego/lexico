import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cloudEnabled } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  clearCollection,
  collectionStats,
  listCollection,
  migrateLocalToCloud,
  type CollectionStats,
} from '@/lib/db';
import { onAuthChange, signIn, signOut, signUp } from '@/lib/auth-store';
import { DAY_MS } from '@/lib/srs';
import { CollectionItem, Familiarity, Word } from '@/lib/types';

const ACCENT = '#C8793A';
const SURFACE = '#F0EDE8';

const FAM_LABEL: Record<Familiarity, string> = {
  [Familiarity.Unknown]:  '陌生 · Nueva',
  [Familiarity.Vague]:    '有印象 · Vaga',
  [Familiarity.Familiar]: '较熟 · Familiar',
  [Familiarity.Mastered]: '掌握 · Dominada',
};

const FAM_DOT: Record<Familiarity, string> = {
  [Familiarity.Unknown]:  '#D8D2C8',
  [Familiarity.Vague]:    '#E5B98A',
  [Familiarity.Familiar]: '#C8793A',
  [Familiarity.Mastered]: '#2E7D5A',
};

function dueLabel(item: CollectionItem, now: number): string {
  if (item.dueAt <= now) return '待复习';
  const days = Math.ceil((item.dueAt - now) / DAY_MS);
  return `${days} 天后`;
}

type Row = { word: Word; item: CollectionItem };

function Stat({ label, labelEs, value }: { label: string; labelEs: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>
        {label} · {labelEs}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [stats, setStats] = useState<CollectionStats>({ total: 0, due: 0, mastered: 0 });
  const [rows, setRows] = useState<Row[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => { return onAuthChange(setUser); }, []);

  const refresh = useCallback(() => {
    const now = Date.now();
    Promise.all([collectionStats(now), listCollection()]).then(([s, r]) => {
      setStats(s);
      setRows(r);
    });
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { refresh(); }, [user, refresh]);

  const onClear = useCallback(async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    await clearCollection();
    setConfirmClear(false);
    refresh();
  }, [confirmClear, refresh]);

  const handleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        await signIn(email, password);
        await migrateLocalToCloud();
      } else {
        await signUp(email, password);
        setAuthError('注册成功！请检查邮箱确认链接。');
      }
      setEmail('');
      setPassword('');
    } catch (e: any) {
      setAuthError(e.message ?? '操作失败');
    } finally {
      setAuthLoading(false);
    }
  };

  const now = Date.now();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            Platform.OS === 'web' && { paddingTop: 52 },
          ]}>

          <View style={styles.inner}>
          {/* ── 账户区 ── */}
          {!cloudEnabled ? <Text style={{ color: theme.text }}>Local sample · 数据仅保存在此设备。云端账户为可选配置。</Text> : user ? (
            <View style={[styles.userBar, { borderBottomColor: theme.border }]}>
              <Text style={[styles.userEmail, { color: theme.textMuted }]}>{user.email}</Text>
              <Pressable onPress={() => signOut()}>
                <Text style={[styles.userAction, { color: theme.textMuted }]}>退出</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authForm}>
              <Text style={[styles.authTitle, { color: theme.text }]}>
                {authMode === 'signin' ? '登录' : '注册'}
              </Text>
              <View style={[styles.inputWrap, { borderBottomColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="邮箱"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={[styles.inputWrap, { borderBottomColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="密码"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              {authError ? (
                <Text style={[styles.authError, { color: theme.textMuted }]}>{authError}</Text>
              ) : null}
              <Pressable
                onPress={handleAuth}
                disabled={authLoading}
                style={({ pressed }) => [styles.authBtn, pressed && styles.pressed]}>
                <Text style={styles.authBtnText}>
                  {authLoading ? '…' : authMode === 'signin' ? '登录' : '注册'}
                </Text>
              </Pressable>
              <Pressable onPress={() => { setAuthMode(m => m === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}>
                <Text style={[styles.toggleAuth, { color: theme.textMuted }]}>
                  {authMode === 'signin' ? '没有账号？注册' : '已有账号？登录'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── 统计区 ── */}
          <View style={styles.statsCard}>
            <View style={styles.statsBar} />
            <View style={styles.statsRow}>
              <Stat label="已收藏" labelEs="Guardadas"  value={stats.total} />
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <Stat label="待复习" labelEs="Pendientes" value={stats.due} />
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <Stat label="已掌握" labelEs="Dominadas"  value={stats.mastered} />
            </View>
          </View>

          {/* ── 积累本 ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>积累本</Text>
            {rows.length > 0 && (
              <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
                {rows.length} 词
              </Text>
            )}
          </View>

          {rows.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              还没有收藏的单词。去「单词」里收藏吧。
            </Text>
          ) : (
            rows.map(({ word, item }) => (
              <Pressable
                key={word.id}
                onPress={() => router.push(`/word/${word.id}`)}
                style={({ pressed }) => [styles.wordRow, pressed && styles.pressed]}>
                <View style={[styles.famDot, { backgroundColor: FAM_DOT[item.familiarity] }]} />
                <View style={styles.wordMain}>
                  <Text style={[styles.wordSpanish, { color: theme.text, fontFamily: Fonts.serif }]}>
                    {word.spanish}
                  </Text>
                  <Text style={styles.wordGloss} numberOfLines={1}>
                    <Text style={{ color: theme.text }}>{word.chinese}</Text>
                    {word.english ? (
                      <Text style={{ color: theme.textMuted }}>{'  '}{word.english}</Text>
                    ) : null}
                  </Text>
                </View>
                <View style={styles.wordMeta}>
                  <Text style={styles.famLabel}>{FAM_LABEL[item.familiarity]}</Text>
                  <Text style={[styles.dueLabel, { color: theme.textMuted }]}>
                    {dueLabel(item, now)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}

          {/* ── 清空（危险操作，底部小字链接）── */}
          {rows.length > 0 && (
            <Pressable onPress={onClear} style={styles.clearWrap}>
              <Text style={styles.clearLink}>
                {confirmClear ? '确认清空？再点一次' : '清空积累本'}
              </Text>
            </Pressable>
          )}

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
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },

  /* ── Auth: logged in ── */
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userEmail: { fontSize: 13 },
  userAction: { fontSize: 13 },

  /* ── Auth: form ── */
  authForm: { gap: Spacing.three },
  authTitle: { fontSize: 17, fontWeight: '600' },
  inputWrap: { borderBottomWidth: 1 },
  input: {
    fontSize: 15,
    paddingVertical: Spacing.two,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  authError: { fontSize: 13 },
  authBtn: {
    backgroundColor: ACCENT,
    paddingVertical: Spacing.three,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  authBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleAuth: { fontSize: 13, textAlign: 'center' },

  /* ── Stats ── */
  statsCard: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  statsBar: { width: 4, backgroundColor: ACCENT },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: Spacing.two,
  },
  stat: { alignItems: 'center', gap: Spacing.one },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  /* ── Section header ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionCount: { fontSize: 13 },

  /* ── Collection rows ── */
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  famDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  wordMain: { flex: 1, gap: 3 },
  wordSpanish: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
  wordGloss: { fontSize: 13, lineHeight: 18 },
  wordMeta: { alignItems: 'flex-end', gap: 3 },
  famLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    textAlign: 'right',
  },
  dueLabel: {
    fontSize: 11,
    textAlign: 'right',
  },

  /* ── Clear ── */
  clearWrap: {
    alignItems: 'center',
    paddingTop: Spacing.four,
    marginTop: Spacing.four,
  },
  clearLink: {
    fontSize: 13,
    color: '#C0392B',
  },

  pressed: { opacity: 0.55 },
  empty: { fontSize: 14 },
});
