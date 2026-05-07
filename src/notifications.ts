import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

let enabled = true;

export function setNotifEnabled(val: boolean) {
  enabled = val;
}

export function isNotifEnabled(): boolean {
  return enabled;
}

export async function notify(title: string, body?: string) {
  if (!enabled) return;
  let granted = await isPermissionGranted();
  if (!granted) {
    const perm = await requestPermission();
    granted = perm === 'granted';
  }
  if (granted) sendNotification({ title, body });
}
