import React from 'react';
import { Pressable, View } from 'react-native';
import { CalendarDays, Minus, Plus } from 'lucide-react-native';
import { AppText } from '../common/AppText';
import { Chips } from '../common/Chips';
import { useTheme } from '../../theme/useTheme';
import { addDays, fmtDate, toISODate } from '../../utils/dates';

/** Dependency-free due-date selector: quick presets plus a day stepper. Value is YYYY-MM-DD or null. */
export function DueDatePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { theme } = useTheme();
  const today = new Date();
  const diff = value ? Math.round((new Date(`${value}T00:00:00`).getTime() - new Date(`${toISODate(today)}T00:00:00`).getTime()) / 86400000) : 0;
  const setDays = (n: number) => onChange(toISODate(addDays(today, Math.max(0, n))));
  const preset = value == null ? 'none' : [7, 15, 30].includes(diff) ? String(diff) : 'custom';
  const step = (n: number) => (
    <Pressable onPress={() => setDays(diff + n)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' }}>
      {n < 0 ? <Minus size={20} color={theme.colors.text} /> : <Plus size={20} color={theme.colors.text} />}
    </Pressable>
  );
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="label" color="secondary">Due date</AppText>
      <Chips value={preset} onChange={k => (k === 'none' ? onChange(null) : k === 'custom' ? setDays(diff || 3) : setDays(Number(k)))}
        options={[{ key: 'none', label: 'No date' }, { key: '7', label: '7 days' }, { key: '15', label: '15 days' }, { key: '30', label: '30 days' }, { key: 'custom', label: 'Custom' }]} />
      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: 8, borderWidth: 1, borderColor: theme.colors.border }}>
          {step(-1)}
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
            <CalendarDays size={18} color={theme.colors.primary} /><AppText variant="label">{fmtDate(value)}</AppText>
          </View>
          {step(1)}
        </View>
      ) : null}
    </View>
  );
}
