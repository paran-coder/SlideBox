// 라이브러리 폴더 선택, IndexedDB에 핸들 저장·조회, 권한 재확인을 담당한다.

import { useEffect, useState } from "react";
import { get, set } from "idb-keyval";

const HANDLE_STORAGE_KEY = "slidebox:library-dir-handle";
const READWRITE: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };

export async function pickLibraryDirectory(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker(READWRITE);
  await handle.getDirectoryHandle("originals", { create: true });
  await handle.getDirectoryHandle("thumbs", { create: true });
  await set(HANDLE_STORAGE_KEY, handle);
  return handle;
}

export async function getLibraryDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await get<FileSystemDirectoryHandle>(HANDLE_STORAGE_KEY);
  return handle ?? null;
}

export async function ensurePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  if ((await handle.queryPermission(READWRITE)) === "granted") {
    return true;
  }
  const result = await handle.requestPermission(READWRITE);
  return result === "granted";
}

export interface UseLibraryDirectoryResult {
  dirHandle: FileSystemDirectoryHandle | null;
  loading: boolean;
  // 폴더는 연결되어 있지만 readwrite 권한이 살아있지 않은 상태(브라우저 재시작 등).
  needsPermission: boolean;
  // 사용자 클릭 등 제스처가 있는 흐름에서 호출해야 한다(재확인 버튼 onClick 등).
  requestPermission: () => Promise<void>;
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

  async function requestPermission() {
    if (!dirHandle) return;
    const granted = await ensurePermission(dirHandle);
    setNeedsPermission(!granted);
  }

  return { dirHandle, loading, needsPermission, requestPermission };
}
