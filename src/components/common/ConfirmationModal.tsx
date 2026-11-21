import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';
import { PrimaryButton, SecondaryButton } from './Buttons';

type Props = {
  visible: boolean; title: string; message?: string; confirmLabel?: string; cancelLabel?: string;
  danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void; children?: React.ReactNode;
};
export function ConfirmationModal({ visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, loading, onConfirm, onCancel, children }: Props) {
  const { theme } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.xl, padding: 24, gap: 14 }}>
          <AppText variant="heading">{title}</AppText>
          {message ? <AppText color="secondary">{message}</AppText> : null}
          {children}
          <View style={{ gap: 10, marginTop: 4 }}>
            <PrimaryButton title={confirmLabel} onPress={onConfirm} loading={loading} tone={danger ? 'danger' : 'default'} />
            <SecondaryButton title={cancelLabel} onPress={onCancel} disabled={loading} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
