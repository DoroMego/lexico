import { Modal, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Familiarity } from '@/lib/types';

const CHOICES: { label: string; hint: string; value: Familiarity }[] = [
  { label: '完全不熟', hint: '今天就复习', value: Familiarity.Unknown },
  { label: '有点印象', hint: '约 1 天后', value: Familiarity.Vague },
  { label: '比较熟', hint: '约 3 天后', value: Familiarity.Familiar },
  { label: '已掌握', hint: '约 7 天后', value: Familiarity.Mastered },
];

/**
 * Cross-platform familiarity chooser (替代 Alert.alert，后者在 web 上不弹).
 * Used when collecting a word — the user must pick how well they know it.
 */
export function FamiliarityPicker({
  visible,
  word,
  onPick,
  onCancel,
}: {
  visible: boolean;
  word?: string;
  onPick: (value: Familiarity) => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Absorb taps so pressing the sheet doesn't dismiss it. */}
        <Pressable onPress={() => {}}>
          <ThemedView type="background" style={styles.sheet}>
            <ThemedText type="subtitle" style={styles.title}>
              {word ? `「${word}」你现在有多熟？` : '你现在有多熟？'}
            </ThemedText>
            {CHOICES.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => onPick(c.value)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.choice}>
                  <ThemedText type="smallBold">{c.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {c.hint}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
            <Pressable onPress={onCancel} style={styles.cancel}>
              <ThemedText type="small" themeColor="textSecondary">
                取消
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: { marginBottom: Spacing.one },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: { opacity: 0.6 },
  cancel: { alignItems: 'center', paddingVertical: Spacing.two, marginTop: Spacing.one },
});
