// 라이브러리 폴더 선택, IndexedDB에 핸들 저장·조회, 권한 재확인을 담당한다.

import { useEffect, useState } from "react";
import { get, set } from "idb-keyval";

const HANDLE_STORAGE_KEY = "slidebox:library-dir-handle";
const READWRITE: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };

export async function pickLibraryDirectory(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker(READWRITE);
  // PDF/PPTX 원본은 라이브러리 폴더 최상위에 그대로 둔다(별도 originals/ 서브폴더로
  // 복사하지 않음). 사용자가 이미 이 폴더 안에 파일을 모아뒀다면 중복 복사가
  // 생기지 않는다. thumbs/만 생성되는 파생 이미지라 서브폴더로 분리한다.
  await handle.getDirectoryHandle("thumbs", { create: true });
  await set(HANDLE_STORAGE_KEY, handle);
  return handle;
}

export async function getLibraryDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await get<FileSystemDirectoryHandle>(HANDLE_STORAGE_KEY);
  return handle ?? null;
}

export interface UseLibraryDirectoryResult {
  dirHandle: FileSystemDirectoryHandle | null;
  loading: boolean;
  // 폴더는 연결되어 있지만 readwrite 권한이 살아있지 않은 상태(브라우저 재시작 등).
  needsPermission: boolean;
  // 사용자 클릭 등 제스처가 있는 흐름에서 호출해야 한다(재연결 버튼 onClick 등).
  // 저장된 handle에 requestPermission()을 호출하는 대신 폴더 선택 창을 다시 열어
  // 사용자가 같은 폴더를 재선택하게 한다. Chrome 122+부터 저장된 handle에
  // requestPermission()을 호출하면 "영구 권한" 3방향 프롬프트가 뜨는데, 이 프롬프트가
  // 일부 Chromium 파생 브라우저(네이버 웨일 등)에서 브라우저 전체 크래시를 유발하는
  // 것이 확인되어, 이 API 호출 자체를 피하기로 했다.
  reconnect: () => Promise<void>;
}

// 라이브러리 폴더 handle을 불러오고 readwrite 권한이 살아있는지 함께 확인한다.
// 권한 확인 없이 바로 쓰기를 시도하면 "not allowed by the user agent" 에러가 난다.
export function useLibraryDirectory(): UseLibraryDirectoryResult {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const handle = await getLibraryDirectory();
      if (!handle) {
        setLoading(false);
        return;
      }
      setDirHandle(handle);
      const permission = await handle.queryPermission(READWRITE);
      setNeedsPermission(permission !== "granted");
      setLoading(false);
    })();
  }, []);

  async function reconnect() {
    const handle = await pickLibraryDirectory();
    setDirHandle(handle);
    setNeedsPermission(false);
  }

  return { dirHandle, loading, needsPermission, reconnect };
}
