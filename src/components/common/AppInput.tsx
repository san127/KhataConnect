import React, { forwardRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';

type Props = TextInputProps & { label?: string; error?: string; secure?: boolean; left?: React.ReactNode };
export const AppInput = forwardRef<React.ComponentRef<typeof TextInput>, Props>(({ label, error, secure, left, style, ...p }, ref) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const [hidden, setHidden] = useState(!!secure);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <AppText variant="label" color="secondary">{label}</AppText> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: theme.radius.md, borderWidth: 1.5,
        borderColor: error ? c.error : focus ? c.primary : c.border, paddingHorizontal: 14, minHeight: theme.touch }}>
        {left ? <View style={{ marginRight: 8 }}>{left}</View> : null}
        <TextInput ref={ref} {...p} secureTextEntry={secure ? hidden : p.secureTextEntry}
          placeholderTextColor={c.textSecondary} onFocus={e => { setFocus(true); p.onFocus?.(e); }} onBlur={e => { setFocus(false); p.onBlur?.(e); }}
          style={[{ flex: 1, color: c.text, fontSize: theme.font.size.md, paddingVertical: 12 }, style]} />
        {secure ? (
          <Pressable hitSlop={12} onPress={() => setHidden(h => !h)} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            {hidden ? <EyeOff size={20} color={c.textSecondary} /> : <Eye size={20} color={c.textSecondary} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <AppText variant="caption" color="error">{error}</AppText> : null}
    </View>
  );
});
