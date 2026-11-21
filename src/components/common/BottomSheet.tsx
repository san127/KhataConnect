import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';

export function BottomSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ ...StyleFill, backgroundColor: '#00000055' }} onPress={onClose} />
        <View style={{ backgroundColor: theme.colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '88%' }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, marginBottom: 12 }} />
          {title ? <AppText variant="heading" style={{ marginBottom: 12 }}>{title}</AppText> : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const StyleFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
