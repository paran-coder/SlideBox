// 파일명에서 file_key(확장자 제거, 공백 trim, NFC 정규화)를 추출한다.

// macOS는 한글 파일명을 NFD로 저장하므로, 정규화 없이는 Windows에서 만든
// 같은 이름의 파일과 file_key가 일치하지 않는다. 반드시 NFC로 정규화한다.
export function extractFileKey(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const base = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  return base.trim().normalize("NFC");
}

export type ImportableExtension = "pdf" | "pptx";

export function getImportableExtension(
  fileName: string,
): ImportableExtension | null {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot < 0) return null;
  const ext = fileName.slice(lastDot + 1).toLowerCase();
  if (ext === "pdf" || ext === "pptx") return ext;
  return null;
}
