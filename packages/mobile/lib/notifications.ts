import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function registerPushToken(): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    return token.data;
  } catch {
    return null;
  }
}

// Placeholder schedulers — connect to real logic when backend is ready
export async function scheduleEventReminder(
  eventTitle: string,
  eventDate: Date,
  minutesBefore = 60,
): Promise<void> {
  const triggerDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);
  if (triggerDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Event Reminder',
      body: `${eventTitle} starts in ${minutesBefore} minutes!`,
    },
    trigger: { date: triggerDate },
  });
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
