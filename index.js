// /**
//  * @format
//  */
// import { AppRegistry } from 'react-native';
// import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
// import notifee from '@notifee/react-native';
// import App from './App';
// import { name as appName } from './app.json';
// import { displayRemoteMessage } from './src/services/notification/pushService';

// // Data-only FCM messages are shown with Notifee even when the app is closed.
// try {
//   setBackgroundMessageHandler(getMessaging(), displayRemoteMessage);
// } catch (e) {
//   console.warn('[push] Firebase not configured; background messages disabled');
// }
// notifee.onBackgroundEvent(async () => {});

// AppRegistry.registerComponent(appName, () => App);



/**
 * @format
 */
import { AppRegistry } from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { displayRemoteMessage } from './src/services/notification/pushService';

// Handle data-only FCM messages in the background.
setBackgroundMessageHandler(getMessaging(), displayRemoteMessage);

// Required for Notifee background events.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Add handling here later if you need notification actions.
});

AppRegistry.registerComponent(appName, () => App);
