// 설정 화면 — 라이브러리 폴더 연결 섹션 (Task 3에서 API 키 섹션이 추가된다)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensurePermission,
  getLibraryDirectory,
  pickLibraryDirectory,
} from "@/lib/library-dir";
import { readLibrary } from "@/lib/library-json";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const handle = await getLibraryDirectory();
      if (!handle) {
        setLoading(false);
        return;
      }
      setConnectedName(handle.name);
      const permission = await handle.queryPermission({ mode: "readwrite" });
      setNeedsPermission(permission !== "granted");
      setLoading(false);
    })();
  }, []);

  async function handlePick() {
    setError(null);
    try {
      const handle = await pickLibraryDirectory();
      await readLibrary(handle);
      setConnectedName(handle.name);
      setNeedsPermission(false);
      router.push("/");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError("폴더 연결에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  async function handleReauthorize() {
    setError(null);
    const handle = await getLibraryDirectory();
    if (!handle) return;
    const granted = await ensurePermission(handle);
    if (granted) {
      setNeedsPermission(false);
      router.push("/");
    } else {
      setError("폴더 접근 권한이 거부되었습니다.");
    }
  }

  if (loading) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">라이브러리 폴더 연결</h1>

      {connectedName ? (
        <div className="rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">연결된 폴더</p>
          <p className="font-medium">{connectedName}</p>

          {needsPermission && (
            <p className="mt-2 text-sm text-amber-600">
              브라우저를 재시작한 뒤에는 폴더 접근 권한을 다시 허용해야 합니다.
            </p>
          )}

          <div className="mt-4 flex gap-2">
            {needsPermission && (
              <button
                onClick={handleReauthorize}
                className="rounded bg-black px-4 py-2 text-sm text-white"
              >
                폴더 접근 다시 허용
              </button>
            )}
            <button
              onClick={handlePick}
              className="rounded border border-neutral-300 px-4 py-2 text-sm"
            >
              다시 연결
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handlePick}
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          라이브러리 폴더 선택
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
