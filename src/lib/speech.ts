// Platform TTS by default; optional hosted sample audio requires explicit opt-in.
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const AUDIO_BASE = `${SUPABASE_URL}/storage/v1/object/public/audio`;

export type Voice = 'es-ES' | 'es-MX';
export const VOICES: { value: Voice; label: string }[] = [
  { value: 'es-ES', label: '西班牙 (es-ES)' },
  { value: 'es-MX', label: '墨西哥 (es-MX)' },
];

const KEY = 'lexico-public-sample90.voice';
let current: Voice = 'es-ES';

/** Load the saved voice into the cache. Call once on app start. */
export async function loadVoice(): Promise<Voice> {
  const v = await AsyncStorage.getItem(KEY);
  if (v === 'es-ES' || v === 'es-MX') current = v;
  return current;
}

export function getVoice(): Voice {
  return current;
}

export async function setVoice(v: Voice): Promise<void> {
  current = v;
  await AsyncStorage.setItem(KEY, v);
}

/** Pronounce Spanish text using the current voice preference. */
export function speakEs(text: string): void {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Public web demo: never fall back to a network-backed speech voice.
    const voice = window.speechSynthesis.getVoices().find(v => v.localService && v.lang === current)
      ?? window.speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith('es'));
    if (!voice) return; // Install a local Spanish voice to enable pronunciation.
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    window.speechSynthesis.speak(utterance);
    return;
  }
  Speech.speak(text, { language: current });
}

/** Play the Supabase-hosted MP3 for a word, falling back to expo-speech. */
export async function speakWord(word: string): Promise<void> {
  if (process.env.EXPO_PUBLIC_ENABLE_AUDIO !== 'true' || !SUPABASE_URL) { speakEs(word); return; }
  const url = `${AUDIO_BASE}/${encodeURIComponent(word.toLowerCase())}.mp3`;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    try {
      const audio = new (window as any).Audio(url) as HTMLAudioElement;
      await audio.play();
      return;
    } catch {
      speakEs(word);
    }
    return;
  }

  // Native: expo-av
  try {
    const { Audio } = await import('expo-av');
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
  } catch {
    speakEs(word);
  }
}
