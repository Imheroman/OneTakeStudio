/**
 * 미디어 장치 선호도 (localStorage)
 * 재방문 시 이전에 선택한 카메라/마이크를 기본값으로 사용
 */

const KEY_VIDEO = "onetake.preferredVideoDeviceId";
const KEY_AUDIO = "onetake.preferredAudioDeviceId";

function get(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getPreferredVideoDeviceId(): string | null {
  return get(KEY_VIDEO);
}

export function setPreferredVideoDeviceId(deviceId: string): void {
  set(KEY_VIDEO, deviceId);
}

export function getPreferredAudioDeviceId(): string | null {
  return get(KEY_AUDIO);
}

export function setPreferredAudioDeviceId(deviceId: string): void {
  set(KEY_AUDIO, deviceId);
}
