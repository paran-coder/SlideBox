// File System Access API(showDirectoryPicker) 지원 여부를 감지한다.

export function hasDirectoryPickerApi(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      "function"
  );
}

// 네이버 웨일은 Chromium 기반이라 showDirectoryPicker API 자체는 존재한다.
// 실사용 중 브라우저 전체가 죽는 문제가 여러 차례 보고되었다(자세한 경위는
// context-notes.md 참고). 진짜 원인으로 보이는 readLibrary의 처리되지 않은
// NotAllowedError는 고쳤고, 화면 안에서 바로 재연결하지 않고 /settings로 보내는
// 우회도 추가했다. 다만 완전히 해결됐다고 확신할 수 없어 하드 차단은 하지 않되
// 주의 배너 표시용으로 감지 함수는 남겨둔다.
export function isKnownIncompatibleBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Whale\//.test(navigator.userAgent);
}

export function isBrowserSupported(): boolean {
  return hasDirectoryPickerApi();
}
