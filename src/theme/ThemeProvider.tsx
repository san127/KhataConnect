import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, AppTheme } from './lightTheme';
import { darkTheme } from './darkTheme';

export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'kc.themePreference';

type Ctx = {
  theme: AppTheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

export const ThemeContext = createContext<Ctx>({
  theme: lightTheme,
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>('system');
  const [system, setSystem] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(v => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme ?? 'light'));
    return () => sub.remove();
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const theme = useMemo(() => {
    const effective = preference === 'system' ? system ?? 'light' : preference;
    return effective === 'dark' ? darkTheme : lightTheme;
  }, [preference, system]);

  const value = useMemo(() => ({ theme, preference, setPreference }), [theme, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
