// 라이브러리 폴더 최상위의 PDF 파일을 읽어 blob URL로 새 탭에서 연다.

export async function openPdfInNewTab(
  dirHandle: FileSystemDirectoryHandle,
  fileKey: string,
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(`${fileKey}.pdf`);
  const file = await fileHandle.getFile();
  const url = URL.createObjectURL(file);
  window.open(url, "_blank");
}
