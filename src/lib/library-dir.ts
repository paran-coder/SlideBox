// 라이브러리 폴더 선택, IndexedDB에 핸들 저장·조회, 권한 재확인을 담당한다.

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
