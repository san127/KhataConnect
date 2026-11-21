import React from 'react';
import { Search } from 'lucide-react-native';
import { AppInput } from './AppInput';
import { useTheme } from '../../theme/useTheme';

export function SearchBar({ value, onChangeText, placeholder = 'Search' }: { value: string; onChangeText: (s: string) => void; placeholder?: string }) {
  const { theme } = useTheme();
  return <AppInput value={value} onChangeText={onChangeText} placeholder={placeholder} left={<Search size={18} color={theme.colors.textSecondary} />} autoCorrect={false} />;
}
