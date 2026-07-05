import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'oralnote_device_id';

/**
 * 現在のデバイスの固有IDを取得する。存在しない場合は新規生成して保存する。
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return ''; // SSR回避
  }
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * 簡易的なデバイス名を取得する（OSとブラウザ情報から）
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Unknown Device';
  }
  const ua = window.navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.indexOf('Win') !== -1) os = 'Windows PC';
  if (ua.indexOf('Mac') !== -1) os = 'Mac';
  if (ua.indexOf('Linux') !== -1) os = 'Linux';
  
  return os + ' (Wireless Connect)';
}
