// 레퍼런스 상세 화면 — 제목/메모/태그 자동 저장, PDF 열기, PPTX 경로 복사, 라이브러리에서 제거, AI 태깅.
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  buildFullPath,
  isPermissionError,
  useLibraryDirectory,
} from "@/lib/library-dir";
import {
  pruneUnusedCustomTag,
  readLibrary,
  writeLibrary,
  type LibraryData,
  type TagDef,
  type TagKind,
} from "@/lib/library-json";
import { useThumbUrl } from "@/lib/thumb-url";
import { openPdfInNewTab } from "@/lib/open-pdf";
import { runAiTagging, AiTaggingUnauthorizedError } from "@/lib/ai-tagging";
import TagEditor from "@/components/TagEditor";
import SaveToast, { type ToastTrigger } from "@/components/SaveToast";
import LoadingScreen from "@/components/LoadingScreen";
import AppNav from "@/components/AppNav";

// 라이브러리에서 제거할 때 앱이 만든 파생 데이터(썸네일)만 지운다.
// PDF/PPTX 원본은 라이브러리 폴더 최상위에 있는 사용자 소유 파일이라(originals/
// 서브폴더로 복사하지 않는 구조로 바꾼 뒤부터는 특히), 앱이 임의로 지우면 사용자의
// 실제 파일을 파괴하게 된다. 원본은 절대 건드리지 않는다.
async function removeThumbnails(
  dirHandle: FileSystemDirectoryHandle,
  fileKey: string,
): Promise<void> {
  const thumbsRoot = await dirHandle.getDirectoryHandle("thumbs", {
    create: true,
  });
  await thumbsRoot.removeEntry(fileKey, { recursive: true }).catch(() => {});
}

function SlideThumb({
  dirHandle,
  thumb,
  alt,
}: {
  dirHandle: FileSystemDirectoryHandle;
  thumb: string;
  alt: string;
}) {
  const url = useThumbUrl(dirHandle, thumb);
  if (!url) {
    return <div className="aspect-video w-full max-w-md rounded bg-neutral-100" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="w-full max-w-md rounded object-cover" />
  );
}

export default function RefDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const {
    dirHandle,
    loading: checkingDir,
    needsPermission,
  } = useLibraryDirectory();
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [permissionLost, setPermissionLost] = useState(false);
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [toastTrigger, setToastTrigger] = useState<ToastTrigger | null>(null);
  const [aiTagging, setAiTagging] = useState<{
    running: boolean;
    error: string | null;
    unauthorized: boolean;
  }>({ running: false, error: null, unauthorized: false });

  useEffect(() => {
    if (!checkingDir && !dirHandle) {
      router.replace("/settings");
    }
  }, [checkingDir, dirHandle, router]);

  useEffect(() => {
    if (!dirHandle || needsPermission) return;
    (async () => {
      try {
        const data = await readLibrary(dirHandle);
        setLibrary(data);
        const found = data.refs.find((r) => r.id === params.id);
        if (found) {
          setTitle(found.title);
          setMemo(found.memo);
        }
        setLoadingLibrary(false);
      } catch (err) {
        if (isPermissionError(err)) {
          setPermissionLost(true);
          return;
        }
        console.error("라이브러리를 불러오지 못했습니다.", err);
      }
    })();
  }, [dirHandle, needsPermission, params.id]);

  const ref = library?.refs.find((r) => r.id === params.id) ?? null;

  const toastIdRef = useRef(0);
  function showToast(text: string) {
    toastIdRef.current += 1;
    setToastTrigger({ text, id: toastIdRef.current });
  }

  async function mutateLibrary(mutate: (lib: LibraryData) => LibraryData) {
    if (!dirHandle || !library) return;
    const next = mutate(library);
    await writeLibrary(dirHandle, next);
    setLibrary(next);
    showToast("저장됨");
  }

  function handleTitleBlur() {
    if (!ref) return;
    const trimmed = title.trim() || ref.file_key;
    if (trimmed === ref.title) return;
    const refId = ref.id;
    mutateLibrary((lib) => ({
      ...lib,
      refs: lib.refs.map((r) =>
        r.id === refId ? { ...r, title: trimmed } : r,
      ),
    }));
  }

  function handleMemoBlur() {
    if (!ref) return;
    if (memo === ref.memo) return;
    const refId = ref.id;
    mutateLibrary((lib) => ({
      ...lib,
      refs: lib.refs.map((r) => (r.id === refId ? { ...r, memo } : r)),
    }));
  }

  function handleAddFileTag(tagId: string) {
    if (!ref) return;
    const refId = ref.id;
    mutateLibrary((lib) => ({
      ...lib,
      refs: lib.refs.map((r) =>
        r.id === refId ? { ...r, tag_ids: [...r.tag_ids, tagId] } : r,
      ),
    }));
  }

  function handleRemoveFileTag(tagId: string) {
    if (!ref) return;
    const refId = ref.id;
    mutateLibrary((lib) => {
      const next: LibraryData = {
        ...lib,
        refs: lib.refs.map((r) =>
          r.id === refId
            ? {
                ...r,
                tag_ids: r.tag_ids.filter((id) => id !== tagId),
                ai_tag_ids: r.ai_tag_ids.filter((id) => id !== tagId),
              }
            : r,
        ),
      };
      return pruneUnusedCustomTag(next, tagId);
    });
  }

  function handleCreateFileTag(name: string, kind: TagKind) {
    if (!ref) return;
    const refId = ref.id;
    const newTag: TagDef = {
      id: crypto.randomUUID(),
      name,
      kind,
      is_preset: false,
    };
    mutateLibrary((lib) => ({
      ...lib,
      tags: [...lib.tags, newTag],
      refs: lib.refs.map((r) =>
        r.id === refId ? { ...r, tag_ids: [...r.tag_ids, newTag.id] } : r,
      ),
    }));
  }

  function handleAddSlideTag(pageNo: number, tagId: string) {
    if (!ref) return;
    const refId = ref.id;
    mutateLibrary((lib) => ({
      ...lib,
      refs: lib.refs.map((r) =>
        r.id === refId
          ? {
              ...r,
              slides: r.slides.map((s) =>
                s.page_no === pageNo
                  ? { ...s, tag_ids: [...s.tag_ids, tagId] }
                  : s,
              ),
            }
          : r,
      ),
    }));
  }

  function handleRemoveSlideTag(pageNo: number, tagId: string) {
    if (!ref) return;
    const refId = ref.id;
    mutateLibrary((lib) => {
      const next: LibraryData = {
        ...lib,
        refs: lib.refs.map((r) =>
          r.id === refId
            ? {
                ...r,
                slides: r.slides.map((s) =>
                  s.page_no === pageNo
                    ? {
                        ...s,
                        tag_ids: s.tag_ids.filter((id) => id !== tagId),
                        ai_tag_ids: s.ai_tag_ids.filter((id) => id !== tagId),
                      }
                    : s,
                ),
              }
            : r,
        ),
      };
      return pruneUnusedCustomTag(next, tagId);
    });
  }

  function handleCreateSlideTag(pageNo: number, name: string, kind: TagKind) {
    if (!ref) return;
    const refId = ref.id;
    const newTag: TagDef = {
      id: crypto.randomUUID(),
      name,
      kind,
      is_preset: false,
    };
    mutateLibrary((lib) => ({
      ...lib,
      tags: [...lib.tags, newTag],
      refs: lib.refs.map((r) =>
        r.id === refId
          ? {
              ...r,
              slides: r.slides.map((s) =>
                s.page_no === pageNo
                  ? { ...s, tag_ids: [...s.tag_ids, newTag.id] }
                  : s,
              ),
            }
          : r,
      ),
    }));
  }

  async function handleOpenPdf() {
    if (!dirHandle || !ref) return;
    try {
      await openPdfInNewTab(dirHandle, ref.file_key);
    } catch (err) {
      console.error("PDF를 여는 데 실패했습니다.", err);
    }
  }

  async function handleCopyPptxPath() {
    if (!ref) return;
    const fileName = `${ref.file_key}.pptx`;
    const path = buildFullPath(fileName) ?? fileName;
    await navigator.clipboard.writeText(path);
    showToast("경로가 복사되었습니다");
  }

  async function handleRemoveFromLibrary() {
    if (!dirHandle || !library || !ref) return;
    const confirmed = window.confirm(
      `"${ref.title}"을(를) 라이브러리에서 제거할까요?\n` +
        `PDF/PPTX 원본 파일은 폴더에 그대로 남고, 태그·메모·썸네일 등 라이브러리 정보만 삭제됩니다. 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;
    await removeThumbnails(dirHandle, ref.file_key);
    const next: LibraryData = {
      ...library,
      refs: library.refs.filter((r) => r.id !== ref.id),
    };
    await writeLibrary(dirHandle, next);
    router.push("/");
  }

  async function handleRunAiTagging() {
    if (!dirHandle || !library || !ref) return;
    setAiTagging({ running: true, error: null, unauthorized: false });
    try {
      const next = await runAiTagging(dirHandle, library, ref.id);
      setLibrary(next);
      showToast("AI 태깅 완료");
      setAiTagging({ running: false, error: null, unauthorized: false });
    } catch (err) {
      if (err instanceof AiTaggingUnauthorizedError) {
        setAiTagging({ running: false, error: err.message, unauthorized: true });
      } else {
        setAiTagging({
          running: false,
          error:
            err instanceof Error ? err.message : "AI 태깅에 실패했습니다.",
          unauthorized: false,
        });
      }
    }
  }

  if (checkingDir || !dirHandle) {
    return <LoadingScreen />;
  }

  if (needsPermission || permissionLost) {
    // 이 화면 안에서 바로 재연결(showDirectoryPicker 호출)하면 일부 브라우저에서
    // 불안정한 것이 확인되어, 설정 화면으로 보내 그쪽의 재연결 흐름을 타게 한다.
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-8">
        <p className="text-sm text-amber-600">
          {permissionLost
            ? "폴더 접근 권한이 만료되었습니다. 설정에서 폴더를 다시 선택해 주세요."
            : "브라우저를 재시작한 뒤에는 설정에서 라이브러리 폴더를 다시 선택해 접근 권한을 갱신해야 합니다."}
        </p>
        <Link
          href="/settings"
          className="w-fit rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          설정으로 이동
        </Link>
      </main>
    );
  }

  if (loadingLibrary || !library) {
    return <LoadingScreen />;
  }

  if (!ref) {
    return (
      <div className="flex flex-1 flex-col">
        <AppNav />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-8">
          <p className="text-sm text-neutral-600">레퍼런스를 찾을 수 없습니다.</p>
        </main>
      </div>
    );
  }

  const hasAnyTags =
    ref.tag_ids.length > 0 || ref.slides.some((s) => s.tag_ids.length > 0);

  return (
    <div className="flex flex-1 flex-col">
      <AppNav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="w-full border-b border-transparent text-2xl font-semibold focus:border-neutral-300 focus:outline-none"
      />

      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={handleMemoBlur}
        placeholder="메모"
        rows={2}
        className="w-full rounded border border-neutral-200 px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleOpenPdf}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          PDF 열기
        </button>
        {ref.has_pptx && (
          <button
            onClick={handleCopyPptxPath}
            className="rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-600"
            title={
              buildFullPath(`${ref.file_key}.pptx`)
                ? "클릭하면 전체 경로가 복사됩니다"
                : "클릭하면 파일명이 복사됩니다(전체 경로가 필요하면 설정에서 폴더 경로를 등록하세요)"
            }
          >
            {ref.file_key}.pptx
          </button>
        )}
        <button
          onClick={handleRemoveFromLibrary}
          title="PDF/PPTX 원본은 남고, 태그·메모·썸네일 등 라이브러리 정보만 삭제됩니다"
          className="ml-auto rounded border border-red-300 px-3 py-2 text-sm text-red-600"
        >
          라이브러리에서 제거
        </button>
      </div>

      {!hasAnyTags && (
        <div className="flex flex-col gap-2 rounded border border-neutral-200 p-3">
          <button
            onClick={handleRunAiTagging}
            disabled={aiTagging.running}
            className="w-fit rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {aiTagging.running ? "AI 태깅 실행 중..." : "AI 태깅 실행"}
          </button>
          {aiTagging.error && (
            <p className="text-sm text-red-600">
              {aiTagging.error}{" "}
              {aiTagging.unauthorized && (
                <Link href="/settings" className="underline">
                  설정으로 이동
                </Link>
              )}
            </p>
          )}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium">파일 태그</p>
        <TagEditor
          allTags={library.tags}
          assignedTagIds={ref.tag_ids}
          aiTagIds={ref.ai_tag_ids}
          onAdd={handleAddFileTag}
          onRemove={handleRemoveFileTag}
          onCreateTag={handleCreateFileTag}
        />
      </section>

      <section className="flex flex-col gap-6">
        <p className="text-sm font-medium">슬라이드 ({ref.slides.length})</p>
        {ref.slides.map((slide) => (
          <div
            key={slide.page_no}
            className="flex flex-col gap-2 border-t border-neutral-200 pt-4"
          >
            <p className="text-xs text-neutral-500">{slide.page_no}p</p>
            <SlideThumb
              dirHandle={dirHandle}
              thumb={slide.thumb}
              alt={`${ref.title} p${slide.page_no}`}
            />
            <TagEditor
              allTags={library.tags}
              assignedTagIds={slide.tag_ids}
              aiTagIds={slide.ai_tag_ids}
              onAdd={(tagId) => handleAddSlideTag(slide.page_no, tagId)}
              onRemove={(tagId) => handleRemoveSlideTag(slide.page_no, tagId)}
              onCreateTag={(name, kind) =>
                handleCreateSlideTag(slide.page_no, name, kind)
              }
            />
          </div>
        ))}
      </section>

      <SaveToast trigger={toastTrigger} />
      </main>
    </div>
  );
}
