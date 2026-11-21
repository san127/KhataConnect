// Single source of truth for every colour in the app.
export const lightPalette = {
  primary: '#78977A',
  secondary: '#DCE9DA',
  mint: '#EDF4EA',
  background: '#FAFAF6',
  card: '#FFFFFF',
  beige: '#EFE9DD',
  brown: '#A88F78',
  text: '#51483E',
  textSecondary: '#8C8980',
  success: '#5F956A',
  warning: '#D6A45B',
  error: '#C97970',
  border: '#ECE7DC',
  onPrimary: '#FFFFFF',
  shadow: '#51483E',
} as const;

export const darkPalette = {
  primary: '#A2C3A1',
  secondary: '#526B55',
  mint: '#2C362E',
  background: '#171C19',
  card: '#222A24',
  beige: '#D9CEB9',
  brown: '#B9A18A',
  text: '#F1F0E9',
  textSecondary: '#AAAFA6',
  success: '#8FC99A',
  warning: '#E2B66F',
  error: '#DC9188',
  border: '#2F3A32',
  onPrimary: '#14201A',
  shadow: '#000000',
} as const;

export type Palette = { [K in keyof typeof lightPalette]: string };
