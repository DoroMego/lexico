import { cloudEnabled } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { clearMissingWords, listMissingWords, MissingWord } from '@/lib/db';
import { onAuthChange, signIn, signOut } from '@/lib/auth-store';
import { Spacing, MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// UI gate only: Supabase RLS must enforce admin access independently.
const ADMIN_USER_ID = process.env.EXPO_PUBLIC_ADMIN_USER_ID?.trim();
const ACCENT = '#C8793A';
const LANG_LABEL: Record<string, string> = { es: '西语', zh: '中文', en: 'English' };

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function AdminScreen() {
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<MissingWord[]>([]);
  const [cleared, setCleared] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    let fired = false;
    const unsub = onAuthChange((u) => {
      if (!fired) {
        fired = true;
        Promise.resolve().then(() => { setUserId(u?.id ?? null); setReady(true); });
      } else {
        setUserId(u?.id ?? null); setReady(true);
      }
    });
    return unsub;
  }, []);

  const isAdmin = !cloudEnabled || (Boolean(ADMIN_USER_ID) && userId === ADMIN_USER_ID);

  const load = useCallback(() => {
    if (isAdmin) listMissingWords().then(setWords);
  }, [isAdmin]);

  useFocusEffect(load);

  // Re-trigger load when user logs in while page is already focused
  useEffect(() => {
    if (isAdmin) listMissingWords().then(setWords);
  }, [isAdmin]);

  const handleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signIn(email, password);
      setEmail('');
      setPassword('');
    } catch (e: any) {
      setAuthError(e.message ?? '登录失败');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleClear = () => { clearMissingWords(); setWords([]); setCleared(true); };

  const handleCopy = () => {
    if (Platform.OS !== 'web') return;
    navigator.clipboard.writeText(words.map(w => `${w.word}\t${w.lang}\t${w.count}`).join('\n'));
  };

  if (!mounted || !ready) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.gate} />
      </SafeAreaView>
    );
  }

  // Not logged in — show login form
  if (cloudEnabled && !userId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.gate}>
          <Text style={[styles.title, { color: theme.text }]}>管理员登录</Text>
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
          {authError ? <Text style={[styles.authError, { color: theme.textMuted }]}>{authError}</Text> : null}
          <Pressable
            onPress={handleLogin}
            disabled={authLoading}
            style={[styles.loginBtn, { backgroundColor: ACCENT }]}>
            <Text style={styles.loginBtnText}>{authLoading ? '…' : '登录'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Logged in but wrong account
  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.gate}>
          <Text style={[styles.gateText, { color: theme.textMuted }]}>无权限。</Text>
          <Pressable onPress={() => signOut()} style={[styles.loginBtn, { borderWidth: 1, borderColor: theme.border }]}>
            <Text style={[styles.loginBtnText, { color: theme.textMuted }]}>退出</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Admin view
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.centered}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {cloudEnabled ? '待补充词汇' : '本机待补充词汇 · Local reports'}
            {words.length > 0 && <Text style={{ color: theme.textMuted }}> · {words.length} 条</Text>}
          </Text>
          <View style={styles.actions}>
            {Platform.OS === 'web' && words.length > 0 && (
              <Pressable onPress={handleCopy} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: ACCENT }]}>复制</Text>
              </Pressable>
            )}
            {words.length > 0 && (
              <Pressable onPress={handleClear} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: theme.textMuted }]}>清空</Text>
              </Pressable>
            )}
            <Pressable disabled={!cloudEnabled} onPress={() => signOut()} style={styles.actionBtn}>
              <Text style={[styles.actionText, { color: theme.textMuted }]}>{cloudEnabled ? '退出' : '仅此设备'}</Text>
            </Pressable>
          </View>
        </View>

        {words.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            {cleared ? '已清空。' : '暂无提交。'}
          </Text>
        ) : (
          <FlatList
            data={words}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <View style={[styles.langTag, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.langText, { color: theme.textSecondary }]}>
                    {LANG_LABEL[item.lang] ?? item.lang}
                  </Text>
                </View>
                <Text style={[styles.word, { color: theme.text }]}>{item.word}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  ×{item.count}{'  '}{fmt(item.lastAt)}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  gate: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.four, paddingHorizontal: Spacing.six, maxWidth: 360, alignSelf: 'center', width: '100%' },
  gateText: { fontSize: 14, textAlign: 'center' },
  inputWrap: { width: '100%', borderBottomWidth: 1 },
  input: { fontSize: 15, paddingVertical: Spacing.two, backgroundColor: 'transparent', // @ts-ignore
    outlineWidth: 0 },
  authError: { fontSize: 13, textAlign: 'center' },
  loginBtn: { borderRadius: 20, paddingHorizontal: Spacing.six, paddingVertical: Spacing.two + 2 },
  loginBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  title: { fontSize: 17, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  actionBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { fontSize: 14, fontWeight: '500' },
  list: { paddingBottom: Spacing.sixteen },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  langTag: { borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 2, minWidth: 44, alignItems: 'center' },
  langText: { fontSize: 12, fontWeight: '500' },
  word: { flex: 1, fontSize: 15 },
  meta: { fontSize: 13 },
  empty: { textAlign: 'center', marginTop: Spacing.eight, fontSize: 14 },
});
