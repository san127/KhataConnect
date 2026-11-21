export const baseTokens = {
  radius: { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: {
    // Native system font (Inter-like on both platforms)
    size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 30, display: 36 },
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
    },
  },
  touch: 52,
};
