import React from 'react';
import { TextStyle } from 'react-native';
import { AppText } from './AppText';
import { formatINR } from '../../utils/money';

export function AmountDisplay({ amount, size = 'body', color, style }: { amount: number; size?: 'display' | 'title' | 'heading' | 'body'; color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning'; style?: TextStyle }) {
  return <AppText variant={size} color={color} style={style}>{formatINR(amount)}</AppText>;
}
