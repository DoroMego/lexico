import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getDb } from '@/lib/db';
import { initAuth } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    getDb().catch(console.error);
    initAuth().catch(console.error);

    // Handle #access_token=... from Supabase email verification links on web.
    if (supabase && Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          supabase.auth
            .setSession({ access_token: accessToken, refresh_token: refreshToken })
            .catch(console.error);
          // Clean the token out of the URL bar
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FAF8F4' },
          headerTintColor: '#1A1A1A',
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
          headerBackTitle: '返回',
          contentStyle: { backgroundColor: '#FAF8F4', borderTopWidth: 1, borderTopColor: '#D8D2C8' },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="word/[id]" options={{ title: '单词' }} />
        <Stack.Screen name="conjugation/rules" options={{ title: '变位规则' }} />
        <Stack.Screen name="review/session" options={{ title: '复习' }} />
        <Stack.Screen name="topic/[id]" options={{ title: '专题词表' }} />
        <Stack.Screen name="guide/[categoryId]" options={{ title: '语法指南' }} />
        <Stack.Screen name="guide/[categoryId]/[topicId]" options={{ title: '专题' }} />
        <Stack.Screen name="admin" options={{ title: '管理员 · 待补充词汇' }} />
      </Stack>
    </ThemeProvider>
  );
}
