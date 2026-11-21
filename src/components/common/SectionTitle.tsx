import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText variant="heading">{title}</AppText>
      {action ? <Pressable onPress={onAction} hitSlop={10}><AppText variant="label" color="primary">{action}</AppText></Pressable> : null}
    </View>
  );
}
