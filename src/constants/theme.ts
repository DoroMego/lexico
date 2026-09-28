import '@/global.css';
import '@/tokens.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text:               '#1A1A1A',  // --color-ink
    textSecondary:      '#4A4540',  // --color-ink-mid
    textMuted:          '#8A8078',  // --color-ink-muted
    accent:             '#C8793A',  // --color-accent
    accentDim:          '#E5B98A',  // --color-accent-dim
    background:         '#FAF8F4',  // --color-bg
    backgroundElement:  '#F0EDE8',  // --color-surface
    backgroundSelected: '#E8E3DC',  // --color-surface-2
    border:             '#D8D2C8',  // --color-border
    borderStrong:       '#B8B0A4',  // --color-border-strong
    error:              '#C0392B',  // --color-error
    success:            '#2E7D5A',  // --color-success
  },
  dark: {
    text:               '#F0EDE8',
    textSecondary:      '#B8B0A4',
    textMuted:          '#8A8078',
    accent:             '#D4894A',  // lightened for dark bg
    accentDim:          '#6B3D1A',
    background:         '#141210',
    backgroundElement:  '#1E1B18',
    backgroundSelected: '#28231E',
    border:             '#2E2822',
    borderStrong:       '#3E3830',
    error:              '#E05A4A',
    success:            '#4AA87A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    'var(--font-sans)',
    serif:   'var(--font-serif)',
    rounded: 'var(--font-sans)',
    mono:    'var(--font-mono)',
  },
});

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 30,
  '3xl': 38,
} as const;

export const FontWeight = {
  light:    '300' as const,
  regular:  '400' as const,
  headword: '700' as const,
} as const;

export const Radius = {
  xs:   2,
  sm:   4,   // chip / tag
  md:   6,   // card
  lg:   8,   // modal / bottom sheet
} as const;

export const Spacing = {
  half: 2,
  one:  4,
  two:  8,
  three: 12,
  four:  16,
  five:  20,
  six:   24,
  eight: 32,
  ten:   40,
  twelve: 48,
  sixteen: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
