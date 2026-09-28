import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { speakWord } from '@/lib/speech';

interface Props {
  word: string;
  style?: object;
}

export function SpeakableWord({ word, style }: Props) {
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.row}>
        <Text style={style}>{word}</Text>
        <Pressable onPress={() => speakWord(word)} hitSlop={8}>
          <Text style={styles.nativeIcon}>🗣️</Text>
        </Pressable>
      </View>
    );
  }
  return <WebSpeakable word={word} style={style} />;
}

function WebSpeakable({ word, style }: Props) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  return (
    <View>
      <Text
        style={style}
        // @ts-ignore — web-only mouse events
        onMouseEnter={() => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setVisible(true), 2000);
        }}
        // @ts-ignore
        onMouseLeave={() => {
          if (timer.current) { clearTimeout(timer.current); timer.current = null; }
          setVisible(false);
        }}
      >
        {word}
      </Text>
      {visible && (
        <View
          style={styles.tooltip}
          // @ts-ignore
          onMouseLeave={() => setVisible(false)}
        >
          <Pressable
            onPress={() => { speakWord(word); setVisible(false); }}
            style={styles.tooltipBtn}
          >
            <Text style={styles.tooltipIcon}>🗣️</Text>
          </Pressable>
          <Text style={styles.tooltipWord}>{word}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nativeIcon: { fontSize: 14 },
  tooltip: {
    position: 'absolute',
    // @ts-ignore — valid CSS percentage
    bottom: '100%',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 1000,
    marginBottom: 4,
  },
  tooltipBtn: { padding: 2 },
  tooltipIcon: { fontSize: 16 },
  tooltipWord: { color: '#fff', fontSize: 14, fontWeight: '500' as const },
});
