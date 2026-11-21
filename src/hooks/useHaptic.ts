import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export const haptic = (type: 'impactLight' | 'notificationSuccess' | 'notificationError' = 'impactLight') =>
  ReactNativeHapticFeedback.trigger(type, { enableVibrateFallback: true, ignoreAndroidSystemSettings: false });
