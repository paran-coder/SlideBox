// localStorage에 Anthropic API 키를 저장·조회·삭제한다. 서버로 전송되는 경로는 없다.

const API_KEY_STORAGE_KEY = "slidebox:anthropic-api-key";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string): void {
  window.localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearApiKey(): void {
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
}
