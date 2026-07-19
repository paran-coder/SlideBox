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

// 드래그 앤 드롭으로 받은 폴더 핸들을 라이브러리 폴더로 등록한다.
// showDirectoryPicker()(폴더 선택 창)를 아예 거치지 않는 두 번째 연결 경로로,
// 선택 창 자체가 네이티브 크래시하는 브라우저(네이버 웨일)를 위한 우회로다.
// 크래시가 선택 창 쪽 버그라면 이 경로는 살아있을 수 있지만, 더 깊은
// 핸들/권한 처리 쪽 버그라면 이 경로도 죽을 수 있다(검증 전).
// 권한이 부족하면 requestPermission으로 요청한다 — drop 이벤트도 사용자
// 제스처라 프롬프트가 뜰 수 있다. 성공 여부를 반환한다.
export async function adoptDroppedDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const permission = await handle.queryPermission(READWRITE);
  if (permission !== "granted") {
    const result = await handle.requestPermission(READWRITE);
    if (result !== "granted") return false;
  }
  await handle.getDirectoryHandle("thumbs", { create: true });
  await set(HANDLE_STORAGE_KEY, handle);
  return true;
}

export async function getLibraryDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await get<FileSystemDirectoryHandle>(HANDLE_STORAGE_KEY);
  return handle ?? null;
}

// File System Access API는 보안을 위해 파일의 실제(절대) 경로를 웹 페이지에
// 절대 알려주지 않는다. 그래서 "전체 경로 복사"는 자동으로는 불가능하고,
// 사용자가 탐색기 주소창에서 직접 복사해 한 번 입력해둔 값을 그대로 재사용하는
// 방식으로만 가능하다. 이 값은 기기별로 다르므로 localStorage에 저장한다.
const ROOT_PATH_STORAGE_KEY = "slidebox:library-root-path";

export function getLibraryRootPath(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROOT_PATH_STORAGE_KEY);
}

export function setLibraryRootPath(path: string): void {
  window.localStorage.setItem(ROOT_PATH_STORAGE_KEY, path);
}

export function clearLibraryRootPath(): void {
  window.localStorage.removeItem(ROOT_PATH_STORAGE_KEY);
}

// 저장된 루트 경로와 파일명을 합쳐 전체 경로를 만든다. 루트 경로가 없으면 null.
export function buildFullPath(fileName: string): string | null {
  const root = getLibraryRootPath();
  if (!root) return null;
  const trimmed = root.replace(/[\\/]+$/, "");
  return `${trimmed}\\${fileName}`;
}

// 권한이 세션 도중(백그라운드 탭 자동 만료 등) 사라져 파일 읽기/쓰기가
// 거부된 경우를 판별한다. 이 경우 처리하지 않고 던지면 처리되지 않은
// 예외가 되어 Next.js 오류 오버레이로 이어지고, 일부 브라우저(네이버 웨일 등)
// 에서는 그 오버레이 자체가 불안정해 브라우저 전체가 죽는 것으로 보인다.
export function isPermissionError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "NotAllowedError";
}

// 폴더 선택창(showDirectoryPicker)을 다시 띄우지 않고, 이미 저장된 handle에
// 대한 권한만 재요청한다. showDirectoryPicker는 네이버 웨일에서 크래시가
// 재현됐지만, requestPermission은 전혀 다른(가벼운 브라우저 권한 프롬프트)
// API라 별도 문제였다. 반드시 버튼 클릭 같은 사용자 제스처 안에서 호출해야
// 브라우저가 프롬프트를 띄워준다.
export async function requestLibraryPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const permission = await handle.requestPermission(READWRITE);
  return permission === "granted";
}

export interface UseLibraryDirectoryResult {
  dirHandle: FileSystemDirectoryHandle | null;
  loading: boolean;
  // 폴더는 연결되어 있지만 readwrite 권한이 살아있지 않은 상태(브라우저 재시작 등).
  needsPermission: boolean;
  // 폴더를 다시 선택하지 않고 권한만 재요청한다. 성공하면 needsPermission이
  // false로 갱신된다.
  requestPermission: () => Promise<boolean>;
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

  async function requestPermission(): Promise<boolean> {
    if (!dirHandle) return false;
    const granted = await requestLibraryPermission(dirHandle);
    setNeedsPermission(!granted);
    return granted;
  }

  return { dirHandle, loading, needsPermission, requestPermission };
}
