import { darkPalette, Palette } from './colors';
import { baseTokens } from './tokens';
import type { AppTheme } from './lightTheme';

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: darkPalette as Palette,
  ...baseTokens,
  shadow: {
    shadowColor: darkPalette.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 0,
  },
};
