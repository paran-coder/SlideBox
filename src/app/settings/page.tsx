// 설정 화면 — 라이브러리 폴더 연결 + Anthropic API 키(BYOK) 관리를 한 화면에서 다룬다.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  clearLibraryRootPath,
  getLibraryDirectory,
  getLibraryRootPath,
  isPermissionError,
  pickLibraryDirectory,
  requestLibraryPermission,
  setLibraryRootPath,
} from "@/lib/library-dir";
import {
  exportLibraryData,
  importLibraryData,
  pruneAllUnusedCustomTags,
  readLibrary,
  resetLibrary,
  writeLibrary,
  type LibraryData,
  type LibraryExport,
  type TagDef,
  type TagKind,
} from "@/lib/library-json";
import { clearApiKey, getApiKey, setApiKey } from "@/lib/api-key";
import { getSlideHoverZoomEnabled, setSlideHoverZoomEnabled } from "@/lib/ui-prefs";
import AppNav from "@/components/AppNav";

const KIND_LABELS: Record<TagKind, string> = {
  style: "스타일",
  layout: "레이아웃",
  topic: "주제",
};

const KINDS: TagKind[] = ["style", "layout", "topic"];

function TagRow({
  tag,
  onRename,
  onDelete,
}: {
  tag: TagDef;
  onRename: (tagId: string, name: string) => void;
  onDelete: (tagId: string) => void;
}) {
  const [name, setName] = useState(tag.name);

  function handleBlur() {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(tag.name);
      return;
    }
    if (trimmed !== tag.name) {
      onRename(tag.id, trimmed);
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-neutral-300 pl-2 pr-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur}
        className="w-24 py-1 text-xs focus:outline-none"
      />
      <button
        onClick={() => onDelete(tag.id)}
        aria-label={`${tag.name} 태그 삭제`}
        className="rounded-full px-1 text-xs text-neutral-400 hover:text-red-600"
      >
        ×
      </button>
    </div>
  );
}

function AddTagInput({
  kind,
  onCreate,
}: {
  kind: TagKind;
  onCreate: (kind: TagKind, name: string) => void;
}) {
  const [name, setName] = useState("");

  function handleAdd() {
    if (!name.trim()) return;
    onCreate(kind, name);
    setName("");
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-dashed border-neutral-300 pl-2 pr-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
        placeholder="+ 새 태그"
        className="w-20 py-1 text-xs placeholder:text-neutral-400 focus:outline-none"
      />
      <button
        onClick={handleAdd}
        aria-label={`${KIND_LABELS[kind]} 태그 추가`}
        className="rounded-full px-1 text-xs text-neutral-400 hover:text-black"
      >
        +
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [loadingDir, setLoadingDir] = useState(true);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(
    null,
  );
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryData | null>(null);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);

  const [rootPathInput, setRootPathInput] = useState("");
  const [storedRootPath, setStoredRootPath] = useState<string | null>(null);
  const [rootPathMessage, setRootPathMessage] = useState<string | null>(null);

  const [pruneMessage, setPruneMessage] = useState<string | null>(null);

  const [slideHoverZoom, setSlideHoverZoomState] = useState(true);

  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [importExportMessage, setImportExportMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const handle = await getLibraryDirectory();
      if (!handle) {
        setLoadingDir(false);
        return;
      }
      setDirHandle(handle);
      setConnectedName(handle.name);
      const permission = await handle.queryPermission({ mode: "readwrite" });
      setNeedsPermission(permission !== "granted");
      setLoadingDir(false);
    })();

    // localStorage는 클라이언트에서만 읽을 수 있어 SSR 결과(false)와 다를 수 있다.
    // 마운트 후 한 번만 갱신해 하이드레이션 불일치를 피한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasStoredKey(Boolean(getApiKey()));
    setStoredRootPath(getLibraryRootPath());
    setSlideHoverZoomState(getSlideHoverZoomEnabled());
  }, []);

  useEffect(() => {
    if (!dirHandle || needsPermission) return;
    (async () => {
      try {
        const data = await readLibrary(dirHandle);
        setLibrary(data);
      } catch (err) {
        if (isPermissionError(err)) {
          setNeedsPermission(true);
          return;
        }
        console.error("라이브러리를 불러오지 못했습니다.", err);
      }
    })();
  }, [dirHandle, needsPermission]);

  async function handlePickDir() {
    setDirError(null);
    try {
      const handle = await pickLibraryDirectory();
      await readLibrary(handle);
      setDirHandle(handle);
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

  // 폴더 선택창을 다시 띄우지 않고 권한만 재요청한다(가벼운 브라우저 프롬프트).
  async function handleGrantPermission() {
    if (!dirHandle) return;
    setDirError(null);
    const granted = await requestLibraryPermission(dirHandle);
    if (granted) {
      setNeedsPermission(false);
    } else {
      setDirError(
        "권한 허용에 실패했습니다. 폴더를 옮기거나 이름을 바꾼 경우 아래에서 다시 선택해 주세요.",
      );
    }
  }

  async function mutateLibrary(mutate: (lib: LibraryData) => LibraryData) {
    if (!dirHandle || !library) return;
    const next = mutate(library);
    await writeLibrary(dirHandle, next);
    setLibrary(next);
  }

  function handleRenameTag(tagId: string, name: string) {
    mutateLibrary((lib) => ({
      ...lib,
      tags: lib.tags.map((t) => (t.id === tagId ? { ...t, name } : t)),
    }));
  }

  function handleCreateTag(kind: TagKind, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newTag: TagDef = {
      id: crypto.randomUUID(),
      name: trimmed,
      kind,
      is_preset: false,
    };
    mutateLibrary((lib) => ({ ...lib, tags: [...lib.tags, newTag] }));
  }

  function handleDeleteTag(tagId: string) {
    const tag = library?.tags.find((t) => t.id === tagId);
    if (!tag) return;
    const confirmed = window.confirm(
      `"${tag.name}" 태그를 삭제할까요? 이 태그가 붙은 모든 레퍼런스·슬라이드에서 함께 제거됩니다.`,
    );
    if (!confirmed) return;
    mutateLibrary((lib) => ({
      ...lib,
      tags: lib.tags.filter((t) => t.id !== tagId),
      refs: lib.refs.map((r) => ({
        ...r,
        tag_ids: r.tag_ids.filter((id) => id !== tagId),
        ai_tag_ids: r.ai_tag_ids.filter((id) => id !== tagId),
        slides: r.slides.map((s) => ({
          ...s,
          tag_ids: s.tag_ids.filter((id) => id !== tagId),
          ai_tag_ids: s.ai_tag_ids.filter((id) => id !== tagId),
        })),
      })),
    }));
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

  function flashRootPathMessage(message: string) {
    setRootPathMessage(message);
    window.setTimeout(() => setRootPathMessage(null), 2000);
  }

  function handleSaveRootPath() {
    const trimmed = rootPathInput.trim();
    if (!trimmed) return;
    setLibraryRootPath(trimmed);
    setStoredRootPath(trimmed);
    setRootPathInput("");
    flashRootPathMessage("저장되었습니다.");
  }

  function handleClearRootPath() {
    clearLibraryRootPath();
    setStoredRootPath(null);
    flashRootPathMessage("삭제되었습니다.");
  }

  function handleToggleSlideHoverZoom(enabled: boolean) {
    setSlideHoverZoomEnabled(enabled);
    setSlideHoverZoomState(enabled);
  }

  async function handlePruneUnusedTags() {
    if (!library) return;
    const pruned = pruneAllUnusedCustomTags(library);
    const removed = library.tags.length - pruned.tags.length;
    await mutateLibrary(() => pruned);
    setPruneMessage(
      removed > 0
        ? `사용하지 않는 태그 ${removed}개를 정리했습니다.`
        : "정리할 태그가 없습니다.",
    );
    window.setTimeout(() => setPruneMessage(null), 3000);
  }

  async function handleResetLibrary() {
    if (!dirHandle) return;
    const confirmed = window.confirm(
      "라이브러리를 초기화할까요?\n\n모든 레퍼런스와 태그가 삭제되고 태그 사전은 기본 프리셋 상태로 돌아갑니다. PDF/PPTX 원본 파일은 삭제되지 않습니다. 되돌릴 수 없습니다.",
    );
    if (!confirmed) return;
    const fresh = await resetLibrary(dirHandle);
    setLibrary(fresh);
    setResetMessage("라이브러리를 초기화했습니다.");
    window.setTimeout(() => setResetMessage(null), 3000);
  }

  function handleExportLibrary() {
    if (!library) return;
    const data = exportLibraryData(library);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `slidebox-tags-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFileSelected(file: File) {
    if (!library) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as LibraryExport;
      if (parsed.export_version !== 1 || !Array.isArray(parsed.refs)) {
        setImportExportMessage({
          text: "올바른 내보내기 파일이 아닙니다.",
          isError: true,
        });
        return;
      }
      const { library: merged, matchedCount, skippedCount } = importLibraryData(
        library,
        parsed,
      );
      if (matchedCount > 0) {
        await mutateLibrary(() => merged);
      }
      setImportExportMessage({
        text:
          `${matchedCount}개 파일에 태그를 복원했습니다.` +
          (skippedCount > 0
            ? ` ${skippedCount}개는 아직 라이브러리에 없어 건너뛰었습니다. 먼저 위 1번(원본 파일 가져오기)을 했는지, 파일명이 같은지 확인해 주세요.`
            : ""),
        isError: matchedCount === 0,
      });
    } catch {
      setImportExportMessage({
        text: "파일을 읽는 데 실패했습니다.",
        isError: true,
      });
    }
    window.setTimeout(() => setImportExportMessage(null), 8000);
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">설정</h1>
          <p className="mt-1 text-sm text-neutral-500">
            라이브러리 폴더, 화면 표시, 태그 사전, AI 태깅 키를 관리합니다.
          </p>
        </div>

        <section className="rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold">라이브러리 폴더</h2>
          <div className="mt-4">
            {loadingDir ? null : connectedName ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-neutral-50 p-4">
                <div>
                  <p className="text-sm text-neutral-500">연결된 폴더</p>
                  <p className="font-medium">{connectedName}</p>

                  {needsPermission && (
                    <p className="mt-2 text-sm text-amber-600">
                      브라우저를 재시작한 뒤에는 접근 권한을 다시 허용해야
                      합니다.
                    </p>
                  )}
                </div>

                {needsPermission ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      onClick={handleGrantPermission}
                      className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                    >
                      이 폴더 접근 허용
                    </button>
                    <button
                      onClick={handlePickDir}
                      className="text-xs text-neutral-500 underline"
                    >
                      안 되면 폴더 다시 선택
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handlePickDir}
                    className="shrink-0 rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
                  >
                    다시 연결
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handlePickDir}
                className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                라이브러리 폴더 선택
              </button>
            )}

            {dirError && (
              <p className="mt-2 text-sm text-red-600">{dirError}</p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold">폴더 실제 경로</h2>
            <p className="mt-1 text-sm text-neutral-500">PPTX 경로 복사용</p>
            <p className="mt-3 text-sm text-neutral-600">
              브라우저 보안 정책상 앱은 폴더의 실제 경로를 알 수 없습니다.
              탐색기 주소창에서 이 라이브러리 폴더의 경로를 복사해 아래에 한
              번만 붙여넣어 주세요(예:{" "}
              <code className="rounded bg-neutral-100 px-1">
                C:\Users\C\Desktop\ppttest
              </code>
              ).
            </p>

            <label className="mt-4 flex flex-col gap-1 text-sm">
              폴더 경로
              <input
                type="text"
                value={rootPathInput}
                onChange={(e) => setRootPathInput(e.target.value)}
                placeholder={
                  storedRootPath ?? "C:\\Users\\이름\\Desktop\\라이브러리폴더"
                }
                className="rounded border border-neutral-300 px-3 py-2"
              />
            </label>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleSaveRootPath}
                className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                저장
              </button>
              {storedRootPath && (
                <button
                  onClick={handleClearRootPath}
                  className="rounded border border-neutral-300 px-4 py-2 text-sm"
                >
                  삭제
                </button>
              )}
            </div>

            {rootPathMessage && (
              <p className="mt-2 text-sm text-green-700">{rootPathMessage}</p>
            )}
          </section>

          <section className="rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold">화면 표시</h2>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={slideHoverZoom}
                onChange={(e) => handleToggleSlideHoverZoom(e.target.checked)}
              />
              슬라이드 보기에서 마우스를 올리면 크게 보기
            </label>
          </section>
        </div>

        {library && (
          <section className="rounded-xl border border-neutral-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">태그 관리</h2>
              <button
                onClick={handlePruneUnusedTags}
                className="shrink-0 rounded border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
              >
                미사용 태그 정리
              </button>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              이름을 바꾸면 이 태그가 붙은 모든 곳에 그대로 반영됩니다.
              삭제하면 이 태그가 붙은 모든 레퍼런스·슬라이드에서도 함께
              제거됩니다. 프리셋이 아닌 태그 중 아무 곳에도 안 쓰이는 태그는
              &ldquo;미사용 태그 정리&rdquo;로 한 번에 지울 수 있습니다.
            </p>
            {pruneMessage && (
              <p className="mt-2 text-sm text-green-700">{pruneMessage}</p>
            )}
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {KINDS.map((kind) => (
                <div key={kind} className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-neutral-500">
                    {KIND_LABELS[kind]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {library.tags
                      .filter((t) => t.kind === kind)
                      .map((tag) => (
                        <TagRow
                          key={tag.id}
                          tag={tag}
                          onRename={handleRenameTag}
                          onDelete={handleDeleteTag}
                        />
                      ))}
                    <AddTagInput kind={kind} onCreate={handleCreateTag} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {library && (
          <section className="rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold">데이터 내보내기 / 가져오기</h2>
            <p className="mt-2 text-sm text-neutral-600">
              다른 컴퓨터나 브라우저로 옮길 때, 태그를 다시 AI 태깅하지
              않고 재사용할 수 있습니다(원본 파일·썸네일은 포함하지 않고
              태그 정보만 내려받습니다).
            </p>
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <p className="font-semibold">내보내기 전에 확인하세요</p>
              <ul className="mt-2 flex flex-col gap-2 list-disc pl-4">
                <li>
                  매칭 기준은 <strong>파일명</strong>입니다(폴더 위치는
                  상관없습니다). 새 컴퓨터에서 PDF/PPTX 파일 이름을 바꾸면
                  그 파일은 매칭되지 않고 건너뛰어집니다 — 파일명을 그대로
                  유지한 채 옮기세요.
                </li>
                <li>
                  내보내기는 <strong>그 순간의 스냅샷</strong>입니다. 내보낸
                  뒤에 태그를 더 추가하거나 AI 태깅을 더 돌렸다면, 옮기기
                  직전에 다시 한번 내보내야 최신 상태가 반영됩니다.
                </li>
                <li>
                  이미 직접 고쳐둔 제목은 가져오기해도 되돌아가지 않습니다
                  (실수로 덮어쓰지 않도록 태그만 병합됩니다).
                </li>
                <li>
                  내보내기 파일(JSON) 자체는 원본 PDF/PPTX와 같은 폴더에
                  둘 필요가 없습니다 — USB, 클라우드, 이메일 등 어디로
                  옮기셔도 됩니다.
                </li>
              </ul>
            </div>
            <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-100 p-4 text-sm text-amber-900">
              <p className="font-semibold">가져오기 순서가 중요합니다</p>
              <ol className="mt-2 flex flex-col gap-3">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                    1
                  </span>
                  <span>
                    <strong>먼저 원본 파일 가져오기.</strong> 새
                    컴퓨터/브라우저에서{" "}
                    <Link href="/import" className="underline">
                      가져오기
                    </Link>
                    로 같은 PDF/PPTX 파일들을 라이브러리에 등록합니다.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                    2
                  </span>
                  <span>
                    <strong>그다음 태그 파일 가져오기.</strong> 여기서
                    내보내둔 JSON 파일을 &ldquo;가져오기&rdquo;하면 파일명이
                    같은 항목에 태그가 자동으로 복원됩니다.
                  </span>
                </li>
              </ol>
              <p className="mt-3 text-xs font-medium text-amber-800">
                순서를 바꿔서 1번 없이 태그 파일부터 가져오면 매칭할 파일이
                없어 전부 건너뛰어집니다.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleExportLibrary}
                className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                내보내기
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                가져오기
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFileSelected(file);
                  e.target.value = "";
                }}
              />
            </div>
            {importExportMessage && (
              <p
                className={`mt-2 text-sm ${
                  importExportMessage.isError
                    ? "text-red-600"
                    : "text-green-700"
                }`}
              >
                {importExportMessage.text}
              </p>
            )}
          </section>
        )}

        <section className="rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold">Anthropic API 키 (BYOK)</h2>
          <p className="mt-2 text-sm text-neutral-600">
            이 키는 브라우저의 localStorage에만 저장되며, 운영자 서버로는
            전송되지 않습니다. AI 태깅 실행 시 브라우저에서
            api.anthropic.com으로 직접 전송됩니다.
          </p>
          <p className="mt-2 text-sm font-medium text-amber-700">
            이 키는 비밀번호와 동일하게 취급하고 다른 사람과 공유하지 마세요.
          </p>

          <label className="mt-4 flex flex-col gap-1 text-sm">
            API 키
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                hasStoredKey
                  ? "저장된 키가 있습니다 (변경하려면 입력)"
                  : "sk-ant-..."
              }
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSaveKey}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
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

          {keyMessage && (
            <p className="mt-2 text-sm text-green-700">{keyMessage}</p>
          )}

          <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
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

        {library && (
          <section className="rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-700">
              라이브러리 초기화
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              모든 레퍼런스와 태그를 지우고 태그 사전을 기본 프리셋 상태로
              되돌립니다. PDF/PPTX 원본 파일은 지워지지 않습니다. 되돌릴
              수 없습니다.
            </p>
            <button
              onClick={handleResetLibrary}
              className="mt-4 rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              라이브러리 초기화
            </button>
            {resetMessage && (
              <p className="mt-2 text-sm text-green-700">{resetMessage}</p>
            )}
          </section>
        )}
        </div>
      </main>
    </div>
  );
}
