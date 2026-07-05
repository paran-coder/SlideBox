// File System Access API(showDirectoryPicker) 지원 여부를 감지한다.

export function hasDirectoryPickerApi(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      "function"
  );
}

// 네이버 웨일은 Chromium 기반이라 showDirectoryPicker API 자체는 존재한다.
// 과거 저장된 handle에 requestPermission()을 호출했을 때 브라우저가 크래시되는
// 문제가 있었으나, 그 호출 자체를 앱에서 제거했다(library-dir.ts의 reconnect 참고).
// 다만 다른 문제가 재발할 가능성을 배제할 수 없어, 차단은 하지 않되 주의 배너용으로
// 감지 함수는 남겨둔다.
export function isKnownIncompatibleBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Whale\//.test(navigator.userAgent);
}

export function isBrowserSupported(): boolean {
  return hasDirectoryPickerApi();
}
