export const COLORS = {
  saffron: '#FF6F00',
  saffronLight: '#FFA040',
  saffronPale: '#FFF3E0',
  background: '#FFFBF5',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textMuted: '#9E9E9E',
  sanskritText: '#3E2723',
  success: '#4CAF50',
} as const;

export const DARK_COLORS = {
  ...COLORS,
  saffronPale: '#2A1A00',
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#F5F5F5',
  textSecondary: '#BDBDBD',
  textMuted: '#757575',
  sanskritText: '#FFCC80',
} as const;

export type ThemeColors = {
  [K in keyof typeof COLORS]: string;
};

export function getColors(dark: boolean): ThemeColors {
  return dark ? DARK_COLORS : COLORS;
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZES = {
  caption: 13,
  body: 16,
  bodyLarge: 18,
  subtitle: 20,
  title: 24,
  heading: 28,
  sanskrit: 26,
} as const;

export const TOUCH_TARGET = {
  minHeight: 56,
  minWidth: 56,
} as const;

const FONT_SCALE = { small: 0.85, medium: 1, large: 1.2 } as const;

export function getScaledFontSizes(size: 'small' | 'medium' | 'large') {
  const scale = FONT_SCALE[size];
  return {
    caption: Math.round(FONT_SIZES.caption * scale),
    body: Math.round(FONT_SIZES.body * scale),
    bodyLarge: Math.round(FONT_SIZES.bodyLarge * scale),
    subtitle: Math.round(FONT_SIZES.subtitle * scale),
    title: Math.round(FONT_SIZES.title * scale),
    heading: Math.round(FONT_SIZES.heading * scale),
    sanskrit: Math.round(FONT_SIZES.sanskrit * scale),
  };
}
