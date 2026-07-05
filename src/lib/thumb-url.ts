// 라이브러리 폴더 안의 이미지 파일을 읽어 <img> 태그에 쓸 수 있는 blob URL로 변환한다.

import { useEffect, useState } from "react";

// 폴더 재연결 직후 화면에 보이는 파일 수만큼 썸네일을 한꺼번에 동시에 읽으면
// 일부 브라우저(네이버 웨일 등)에서 불안정해지는 것이 확인되어, 앱 전체에서
// 동시 파일 읽기 개수를 제한한다(단순 세마포어).
const MAX_CONCURRENT_THUMB_READS = 4;
let activeThumbReads = 0;
const thumbReadQueue: Array<() => void> = [];

function acquireThumbReadSlot(): Promise<() => void> {
  return new Promise((resolve) => {
    function tryAcquire() {
      if (activeThumbReads < MAX_CONCURRENT_THUMB_READS) {
        activeThumbReads++;
        resolve(() => {
          activeThumbReads--;
          const next = thumbReadQueue.shift();
          next?.();
        });
      } else {
        thumbReadQueue.push(tryAcquire);
      }
    }
    tryAcquire();
  });
}

export async function readThumbAsBlobUrl(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<string> {
  const parts = relativePath.split("/").filter(Boolean);
  let dir = dirHandle;
  for (const part of parts.slice(0, -1)) {
    dir = await dir.getDirectoryHandle(part);
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
  const file = await fileHandle.getFile();
  return URL.createObjectURL(file);
}

// 컴포넌트에서 썸네일 경로 하나를 blob URL로 변환해 주는 훅. 언마운트 시 URL을 해제한다.
export function useThumbUrl(
  dirHandle: FileSystemDirectoryHandle | null,
  relativePath: string | null,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!dirHandle || !relativePath) {
      // 입력이 없어지면 이전 blob URL 상태를 정리한다(파생 상태 초기화).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      const release = await acquireThumbReadSlot();
      try {
        if (cancelled) return;
        const blobUrl = await readThumbAsBlobUrl(dirHandle, relativePath);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        objectUrl = blobUrl;
        setUrl(blobUrl);
      } catch (err) {
        console.error("썸네일을 불러오지 못했습니다.", err);
      } finally {
        release();
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dirHandle, relativePath]);

  return url;
}
