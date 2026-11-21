import React, { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { PrimaryButton } from '../../components/common/Buttons';
import { ErrorState, LoadingIndicator } from '../../components/common/States';
import { useLoad } from '../../hooks/useLoad';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { getReminderSettings, saveReminderSettings } from '../../services/shop/shopService';
import { friendlyError } from '../../utils/errors';

function Stepper({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const { theme } = useTheme();
  const b = (d: number, I: typeof Plus) => (
    <Pressable onPress={() => onChange(Math.min(max, Math.max(min, value + d)))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' }}><I size={20} color={theme.colors.text} /></Pressable>
  );
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label">{label}</AppText><AppText variant="caption" color="secondary">{hint}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>{b(-1, Minus)}<AppText variant="heading">{value} {value === 1 ? 'day' : 'days'}</AppText>{b(1, Plus)}</View>
    </View>
  );
}

/** Controls the server-side reminder job (runs daily, even when no one has the app open). */
export function ReminderSettingsScreen() {
  const { theme } = useTheme();
  const shopId = useAppStore(s => s.selectedShopId)!;
  const { data, loading, error, reload } = useLoad(() => getReminderSettings(shopId), [shopId]);
  const [enabled, setEnabled] = useState(true);
  const [before, setBefore] = useState(2);
  const [after, setAfter] = useState(3);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setEnabled(data.reminder_enabled); setBefore(data.reminder_days_before); setAfter(data.reminder_days_after); } }, [data]);
  if (loading) return <Screen><Header title="Reminders" /><LoadingIndicator /></Screen>;
  if (error) return <Screen><Header title="Reminders" /><ErrorState message={error} onRetry={reload} /></Screen>;
  return (
    <Screen>
      <Header title="Reminder settings" />
      <RoundedCard style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><AppText variant="label">Send due-date reminders</AppText><AppText variant="caption" color="secondary">Customers are reminded automatically each morning.</AppText></View>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} thumbColor={theme.colors.card} />
        </View>
        {enabled ? (<>
          <Stepper label="Remind before due date" hint="Customer gets a 'due soon' alert this many days ahead." value={before} min={0} max={30} onChange={setBefore} />
          <Stepper label="Repeat overdue reminders every" hint="After the due date, both of you are reminded at this interval." value={after} min={1} max={60} onChange={setAfter} />
        </>) : null}
      </RoundedCard>
      <PrimaryButton title="Save" loading={busy} onPress={async () => {
        setBusy(true);
        try { await saveReminderSettings(shopId, { reminder_enabled: enabled, reminder_days_before: before, reminder_days_after: after }); Alert.alert('Saved'); }
        catch (e) { Alert.alert('Could not save', friendlyError(e)); } finally { setBusy(false); }
      }} />
    </Screen>
  );
}
