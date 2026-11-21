// import React from 'react';
// import { View } from 'react-native';
// import { Leaf } from 'lucide-react-native';
// import { Screen } from '../../components/common/Screen';
// import { AppText } from '../../components/common/AppText';
// import { useTheme } from '../../theme/useTheme';

// export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
//   const { theme } = useTheme();
//   return (
//     <Screen contentStyle={{ paddingTop: 32 }}>
//       <View style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
//         <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
//           <Leaf size={34} color={theme.mode === 'dark' ? theme.colors.text : theme.colors.primary} />
//         </View>
//         <AppText variant="caption" color="brown" style={{ letterSpacing: 2, fontWeight: '700' }}>KHATACONNECT</AppText>
//       </View>
//       <View style={{ gap: 6 }}>
//         <AppText variant="title">{title}</AppText>
//         {subtitle ? <AppText color="secondary">{subtitle}</AppText> : null}
//       </View>
//       {children}
//     </Screen>
//   );
// }



import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Leaf } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { AppText } from '../../components/common/AppText';
import { useTheme } from '../../theme/useTheme';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <Screen contentStyle={{ padding: 0 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 40,
            gap: 20,
          }}
        >
          <View style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                backgroundColor: theme.colors.secondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Leaf
                size={34}
                color={
                  theme.mode === 'dark'
                    ? theme.colors.text
                    : theme.colors.primary
                }
              />
            </View>

            <AppText
              variant="caption"
              color="brown"
              style={{ letterSpacing: 2, fontWeight: '700' }}
            >
              KHATACONNECT
            </AppText>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="title">{title}</AppText>
            {subtitle ? (
              <AppText color="secondary">{subtitle}</AppText>
            ) : null}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

