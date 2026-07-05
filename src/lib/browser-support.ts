// File System Access API(showDirectoryPicker) 지원 여부를 감지한다.

export function hasDirectoryPickerApi(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      "function"
  );
}

// 네이버 웨일은 Chromium 기반이라 showDirectoryPicker API 자체는 존재하지만,
// 폴더 접근 권한 요청(handle.requestPermission) 시 브라우저 전체가 크래시되는
// 문제가 실사용 중 확인되어 기능 감지와 별개로 명시적으로 막는다.
export function isKnownIncompatibleBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Whale\//.test(navigator.userAgent);
}

export function isBrowserSupported(): boolean {
  return hasDirectoryPickerApi() && !isKnownIncompatibleBrowser();
}
