// 설정 화면 — 라이브러리 폴더 연결 + Anthropic API 키(BYOK) 관리를 한 화면에서 다룬다.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensurePermission,
  getLibraryDirectory,
  pickLibraryDirectory,
} from "@/lib/library-dir";
import { readLibrary } from "@/lib/library-json";
import { clearApiKey, getApiKey, setApiKey } from "@/lib/api-key";

export default function SettingsPage() {
  const router = useRouter();

  const [loadingDir, setLoadingDir] = useState(true);
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const handle = await getLibraryDirectory();
      if (!handle) {
        setLoadingDir(false);
        return;
      }
      setConnectedName(handle.name);
      const permission = await handle.queryPermission({ mode: "readwrite" });
      setNeedsPermission(permission !== "granted");
      setLoadingDir(false);
    })();

    setHasStoredKey(Boolean(getApiKey()));
  }, []);

  async function handlePickDir() {
    setDirError(null);
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
      setDirError("폴더 연결에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  async function handleReauthorize() {
    setDirError(null);
    const handle = await getLibraryDirectory();
    if (!handle) return;
    const granted = await ensurePermission(handle);
    if (granted) {
      setNeedsPermission(false);
      router.push("/");
    } else {
      setDirError("폴더 접근 권한이 거부되었습니다.");
    }
  }

  function flashKeyMessage(message: string) {
    setKeyMessage(message);
    window.setTimeout(() => setKeyMessage(null), 2000);
  }

  function handleSaveKey() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    setHasStoredKey(true);
    setApiKeyInput("");
    flashKeyMessage("저장되었습니다.");
  }

  function handleClearKey() {
    clearApiKey();
    setHasStoredKey(false);
    flashKeyMessage("삭제되었습니다.");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-10 p-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">라이브러리 폴더</h1>

        {loadingDir ? null : connectedName ? (
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
                onClick={handlePickDir}
                className="rounded border border-neutral-300 px-4 py-2 text-sm"
              >
                다시 연결
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handlePickDir}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            라이브러리 폴더 선택
          </button>
        )}

        {dirError && <p className="text-sm text-red-600">{dirError}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Anthropic API 키 (BYOK)</h2>
        <p className="text-sm text-neutral-600">
          이 키는 브라우저의 localStorage에만 저장되며, 운영자 서버로는
          전송되지 않습니다. AI 태깅 실행 시 브라우저에서
          api.anthropic.com으로 직접 전송됩니다.
        </p>
        <p className="text-sm font-medium text-amber-700">
          이 키는 비밀번호와 동일하게 취급하고 다른 사람과 공유하지 마세요.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          API 키
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={
              hasStoredKey ? "저장된 키가 있습니다 (변경하려면 입력)" : "sk-ant-..."
            }
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSaveKey}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            저장
          </button>
          {hasStoredKey && (
            <button
              onClick={handleClearKey}
              className="rounded border border-neutral-300 px-4 py-2 text-sm"
            >
              삭제
            </button>
          )}
        </div>

        {keyMessage && <p className="text-sm text-green-700">{keyMessage}</p>}

        <div className="rounded-lg border border-neutral-200 p-4 text-sm text-neutral-600">
          <p className="font-medium text-neutral-800">키 발급 방법</p>
          <ol className="mt-2 list-decimal pl-5">
            <li>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Anthropic Console
              </a>
              에 로그인합니다.
            </li>
            <li>API Keys 메뉴에서 새 키를 발급합니다.</li>
            <li>월 지출 한도(budget)를 설정해 두는 것을 권장합니다.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
