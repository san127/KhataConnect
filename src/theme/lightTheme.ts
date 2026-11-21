import { lightPalette, Palette } from './colors';
import { baseTokens } from './tokens';

export type AppTheme = typeof baseTokens & {
  mode: 'light' | 'dark';
  colors: Palette;
  shadow: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: lightPalette as Palette,
  ...baseTokens,
  shadow: {
    shadowColor: lightPalette.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
