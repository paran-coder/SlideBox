// 라이브러리 폴더 최상위의 PDF 파일을 읽어 blob URL로 새 탭에서 연다.

export async function openPdfInNewTab(
  dirHandle: FileSystemDirectoryHandle,
  fileKey: string,
): Promise<void> {
  // 파일을 다 읽은 뒤에 window.open을 호출하면, 클릭 이벤트(사용자 제스처)로부터
  // 이미 await가 여러 번 지난 시점이라 크롬이 "사용자가 직접 연 게 아니다"로
  // 판단해 팝업 차단으로 조용히 막는다. 그래서 클릭 즉시(await 이전에) 빈 탭을
  // 먼저 열어 사용자 제스처를 소비해두고, 파일을 다 읽은 뒤 그 탭의 주소만 바꾼다.
  const newTab = window.open("", "_blank");
  try {
    const fileHandle = await dirHandle.getFileHandle(`${fileKey}.pdf`);
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);
    if (newTab) {
      newTab.location.href = url;
    } else {
      // 그래도 안 열렸다면(팝업이 완전히 차단된 브라우저 설정 등) 한 번 더 시도.
      window.open(url, "_blank");
    }
  } catch (err) {
    // 파일이 없거나 권한이 만료된 경우 — 미리 열어둔 빈 탭을 그대로 두면
    // 사용자에게 정체불명의 빈 탭만 남으므로 닫고 에러는 호출부로 넘긴다.
    newTab?.close();
    throw err;
  }
}
