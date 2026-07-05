// File System Access API(showDirectoryPicker) 지원 여부를 감지한다.

export function isBrowserSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      "function"
  );
}
