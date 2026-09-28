import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Colors, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';

const ACCENT = '#C8793A';
export const NAV_HEIGHT = 52;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="new-words" href="/new-words" asChild>
            <TabButton>新词</TabButton>
          </TabTrigger>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>单词</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>复习</TabButton>
          </TabTrigger>
          <TabTrigger name="guide" href={'/(tabs)/guide' as any} asChild>
            <TabButton>指南</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>我的</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <Text style={[styles.tabText, { color: isFocused ? ACCENT : colors.textMuted }]}>
        {children}
      </Text>
      <View style={[styles.tabUnderline, isFocused && styles.tabUnderlineActive]} />
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View
      {...props}
      style={[
        styles.navBar,
        { backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}>
      <View style={styles.navInner}>
        {/* Logo */}
        <View style={styles.brandWrap}>
          <Text>
            <Text style={[styles.brandZh, { color: colors.text }]}>楽西</Text>
            <Text style={[styles.brandSep, { color: colors.textMuted }]}> · </Text>
            <Text style={[styles.brandEs, { color: colors.text }]}>Léxico</Text>
          </Text>
        </View>

        {/* Nav tabs */}
        <View style={styles.tabList}>
          {props.children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Nav bar ── */
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: NAV_HEIGHT,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 10,
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },

  /* ── Logo ── */
  brandWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  brandZh: {
    fontSize: 15,
    fontWeight: '500',
  },
  brandSep: {
    fontSize: 13,
  },
  brandEs: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '400',
    fontFamily: Fonts.serif,
  },

  /* ── Tabs ── */
  tabList: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tab: {
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '400',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.three,
    right: Spacing.three,
    height: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: ACCENT,
  },
  pressed: {
    opacity: 0.7,
  },
});
