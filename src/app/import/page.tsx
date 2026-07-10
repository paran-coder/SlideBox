// 가져오기 화면 — 단일/일괄 모드로 PDF/PPTX를 라이브러리 폴더에 저장하고 슬라이드로 변환한다.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLibraryDirectory } from "@/lib/library-dir";
import {
  type LibraryData,
  type RefEntry,
  type SlideEntry,
  readLibrary,
  writeLibrary,
} from "@/lib/library-json";
import { convertPdfToImages, type PdfPageImage } from "@/lib/pdf-to-images";
import { extractFileKey, getImportableExtension } from "@/lib/file-key";
import { getApiKey } from "@/lib/api-key";
import { AiTaggingUnauthorizedError, runAiTagging } from "@/lib/ai-tagging";
import LoadingScreen from "@/components/LoadingScreen";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

type ItemStatus =
  | "pending"
  | "converting"
  | "tagging"
  | "done"
  | "failed"
  | "skipped";

interface BatchItem {
  fileKey: string;
  pdfFile: File | null;
  pptxFile: File | null;
  status: ItemStatus;
  error?: string;
}

function checkFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}은(는) 50MB를 초과해 가져올 수 없습니다.`;
  }
  return null;
}

function groupFilesByKey(files: File[]): BatchItem[] {
  const map = new Map<string, BatchItem>();
  for (const file of files) {
    const ext = getImportableExtension(file.name);
    if (!ext) continue;
    const fileKey = extractFileKey(file.name);
    const item = map.get(fileKey) ?? {
      fileKey,
      pdfFile: null,
      pptxFile: null,
      status: "pending" as ItemStatus,
    };
    if (ext === "pdf") item.pdfFile = file;
    else item.pptxFile = file;
    map.set(fileKey, item);
  }
  return Array.from(map.values());
}

// 항상 미리 읽어둔 바이트를 받는다(File을 직접 넘기지 않는다). 가져오는 파일이
// 라이브러리 폴더 안에 이미 있는(=쓰려는 대상과 같은 경로의) 파일일 수 있는데,
// 그 상태에서 File 객체를 쓰기 스트림 안에서 다시 읽으려 하면 쓰기가 시작되는
// 순간 원본 참조가 무효화되어 "could not be read" 에러가 난다. 호출 전에
// arrayBuffer()로 안전하게 읽어두면 이 충돌이 생기지 않는다.
async function writeFileToDir(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: ArrayBuffer | Blob,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function fileExists(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotFoundError") {
      return false;
    }
    throw err;
  }
}

async function clearThumbsDir(
  thumbsRoot: FileSystemDirectoryHandle,
  fileKey: string,
): Promise<void> {
  try {
    await thumbsRoot.removeEntry(fileKey, { recursive: true });
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "NotFoundError")) {
      throw err;
    }
  }
}

async function saveThumbnails(
  thumbsRoot: FileSystemDirectoryHandle,
  fileKey: string,
  images: PdfPageImage[],
): Promise<string[]> {
  const dir = await thumbsRoot.getDirectoryHandle(fileKey, { create: true });
  const paths: string[] = [];
  for (const { page_no, blob } of images) {
    const name = `p${page_no}.jpg`;
    const fileHandle = await dir.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    paths.push(`thumbs/${fileKey}/${name}`);
  }
  return paths;
}

interface ImportPairInput {
  pdfFile: File | null;
  pptxFile: File | null;
  title?: string;
  memo?: string;
}

// PDF(+선택적 PPTX) 한 쌍을 라이브러리 폴더에 저장하고 library.json을 갱신한다.
// PDF 없이 PPTX만 오면 file_key가 일치하는 기존 ref에 PPTX만 연결한다.
async function importFilePair(
  dirHandle: FileSystemDirectoryHandle,
  library: LibraryData,
  input: ImportPairInput,
  options: {
    overwrite: boolean;
    onProgress?: (current: number, total: number) => void;
  },
): Promise<LibraryData> {
  const { pdfFile, pptxFile } = input;
  if (!pdfFile && !pptxFile) {
    throw new Error("가져올 파일이 없습니다.");
  }

  const fileKey = extractFileKey((pdfFile ?? pptxFile!).name);
  const existingIndex = library.refs.findIndex((r) => r.file_key === fileKey);
  const existing = existingIndex >= 0 ? library.refs[existingIndex] : null;

  const thumbsRoot = await dirHandle.getDirectoryHandle("thumbs", {
    create: true,
  });

  if (!pdfFile) {
    if (!existing) {
      throw new Error("먼저 PDF를 가져와 주세요.");
    }
    const pptxBytes = await pptxFile!.arrayBuffer();
    await writeFileToDir(dirHandle, `${fileKey}.pptx`, pptxBytes);
    const refs = [...library.refs];
    refs[existingIndex] = { ...existing, has_pptx: true };
    const next: LibraryData = { ...library, refs };
    await writeLibrary(dirHandle, next);
    return next;
  }

  // 원본이 라이브러리 폴더 최상위에 그대로 저장되므로, 실패 시 롤백에서 삭제하면
  // 안 되는 경우(사용자가 이미 이 폴더 안에 가지고 있던 파일)를 미리 구분해둔다.
  const pdfPreexisted = await fileExists(dirHandle, `${fileKey}.pdf`);
  const pptxPreexisted = pptxFile
    ? await fileExists(dirHandle, `${fileKey}.pptx`)
    : false;

  // 쓰기 스트림을 열기 전에 원본 바이트를 먼저 전부 읽어둔다(writeFileToDir 주석 참고).
  const pdfBytes = await pdfFile.arrayBuffer();
  const pptxBytes = pptxFile ? await pptxFile.arrayBuffer() : null;

  let pdfWritten = false;
  let pptxWritten = false;
  try {
    await writeFileToDir(dirHandle, `${fileKey}.pdf`, pdfBytes);
    pdfWritten = true;
    if (pptxBytes) {
      await writeFileToDir(dirHandle, `${fileKey}.pptx`, pptxBytes);
      pptxWritten = true;
    }

    if (existing) {
      await clearThumbsDir(thumbsRoot, fileKey);
    }

    const images = await convertPdfToImages(pdfBytes, options.onProgress);
    const thumbPaths = await saveThumbnails(thumbsRoot, fileKey, images);

    const slides: SlideEntry[] = images.map((img, i) => ({
      page_no: img.page_no,
      thumb: thumbPaths[i],
      tag_ids: [],
      ai_tag_ids: [],
    }));

    const refEntry: RefEntry = {
      id: existing?.id ?? crypto.randomUUID(),
      file_key: fileKey,
      title: input.title?.trim() || existing?.title || fileKey,
      memo: input.memo ?? existing?.memo ?? "",
      has_pptx: Boolean(pptxFile) || Boolean(existing?.has_pptx),
      created_at: existing?.created_at ?? new Date().toISOString(),
      tag_ids: existing ? existing.tag_ids : [],
      ai_tag_ids: existing ? existing.ai_tag_ids : [],
      slides,
    };

    const refs = [...library.refs];
    if (existingIndex >= 0) {
      refs[existingIndex] = refEntry;
    } else {
      refs.push(refEntry);
    }
    const next: LibraryData = { ...library, refs };
    await writeLibrary(dirHandle, next);
    return next;
  } catch (err) {
    // 이번 시도에서 새로 만든 파일만 정리한다. 이미 폴더 안에 있던 원본은
    // 절대 지우지 않는다(사용자의 기존 파일을 파괴할 수 있기 때문).
    if (pdfWritten && !pdfPreexisted) {
      await dirHandle.removeEntry(`${fileKey}.pdf`).catch(() => {});
    }
    if (pptxWritten && !pptxPreexisted) {
      await dirHandle.removeEntry(`${fileKey}.pptx`).catch(() => {});
    }
    await clearThumbsDir(thumbsRoot, fileKey).catch(() => {});
    throw err;
  }
}

function confirmOverwrite(fileKey: string): boolean {
  return window.confirm(
    `이미 "${fileKey}" 레퍼런스가 있습니다. 덮어쓸까요? (취소하면 건너뜁니다)`,
  );
}

export default function ImportPage() {
  const router = useRouter();
  const {
    dirHandle: libraryDir,
    loading: checkingDir,
    needsPermission,
  } = useLibraryDirectory();
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [hasApiKey, setHasApiKey] = useState(false);

  // 단일 모드
  const [singlePdf, setSinglePdf] = useState<File | null>(null);
  const [singlePptx, setSinglePptx] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [singleProgress, setSingleProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [singleBusy, setSingleBusy] = useState(false);
  const [singleMessage, setSingleMessage] = useState<string | null>(null);
  const [pdfInputKey, setPdfInputKey] = useState(0);
  const [pptxInputKey, setPptxInputKey] = useState(0);

  // 일괄 모드
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [aiTagNow, setAiTagNow] = useState(true);
  const [batchBusy, setBatchBusy] = useState(false);

  useEffect(() => {
    if (!checkingDir && !libraryDir) {
      router.replace("/settings");
    }
  }, [checkingDir, libraryDir, router]);

  useEffect(() => {
    // localStorage는 클라이언트에서만 읽을 수 있어 SSR 결과(false)와 다를 수 있다.
    // 마운트 후 한 번만 갱신해 하이드레이션 불일치를 피한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasApiKey(Boolean(getApiKey()));
  }, []);

  function handleSinglePdfChange(file: File | null) {
    setSinglePdf(file);
    if (file && !title) {
      setTitle(extractFileKey(file.name));
    }
  }

  function handleSinglePptxChange(file: File | null) {
    setSinglePptx(file);
    if (file && !singlePdf && !title) {
      setTitle(extractFileKey(file.name));
    }
  }

  function handleClearSinglePdf() {
    setSinglePdf(null);
    setPdfInputKey((k) => k + 1);
  }

  function handleClearSinglePptx() {
    setSinglePptx(null);
    setPptxInputKey((k) => k + 1);
  }

  async function handleSingleSubmit() {
    if (!libraryDir) return;
    const primary = singlePdf ?? singlePptx;
    if (!primary) {
      setSingleMessage("PDF 또는 PPTX 파일을 선택해 주세요.");
      return;
    }

    for (const f of [singlePdf, singlePptx]) {
      if (f) {
        const sizeError = checkFileSize(f);
        if (sizeError) {
          setSingleMessage(sizeError);
          return;
        }
      }
    }

    setSingleBusy(true);
    setSingleMessage(null);
    setSingleProgress(null);

    try {
      const library = await readLibrary(libraryDir);
      const fileKey = extractFileKey(primary.name);
      const existing = library.refs.find((r) => r.file_key === fileKey);
      let overwrite = false;
      if (existing) {
        if (!confirmOverwrite(fileKey)) {
          setSingleMessage("건너뛰었습니다.");
          return;
        }
        overwrite = true;
      }

      await importFilePair(
        libraryDir,
        library,
        { pdfFile: singlePdf, pptxFile: singlePptx, title, memo },
        {
          overwrite,
          onProgress: (current, total) =>
            setSingleProgress({ current, total }),
        },
      );

      setSingleMessage("가져오기가 완료되었습니다.");
      setSinglePdf(null);
      setSinglePptx(null);
      setTitle("");
      setMemo("");
      setPdfInputKey((k) => k + 1);
      setPptxInputKey((k) => k + 1);
    } catch (err) {
      setSingleMessage(
        err instanceof Error ? err.message : "가져오기에 실패했습니다.",
      );
    } finally {
      setSingleBusy(false);
      setSingleProgress(null);
    }
  }

  function handleBatchFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    setBatchItems(groupFilesByKey(Array.from(fileList)));
  }

  function updateItemStatus(index: number, status: ItemStatus, error?: string) {
    setBatchItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, status, error } : it)),
    );
  }

  async function handleBatchStart() {
    if (!libraryDir || batchItems.length === 0) return;
    setBatchBusy(true);

    let library: LibraryData;
    try {
      library = await readLibrary(libraryDir);
    } catch (err) {
      console.error("라이브러리를 불러오지 못했습니다.", err);
      setBatchBusy(false);
      return;
    }

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      updateItemStatus(i, "converting");

      const sizeError =
        (item.pdfFile && checkFileSize(item.pdfFile)) ||
        (item.pptxFile && checkFileSize(item.pptxFile)) ||
        undefined;
      if (sizeError) {
        updateItemStatus(i, "failed", sizeError);
        continue;
      }

      const existing = library.refs.find((r) => r.file_key === item.fileKey);
      let overwrite = false;
      if (existing && item.pdfFile) {
        if (!confirmOverwrite(item.fileKey)) {
          updateItemStatus(i, "skipped");
          continue;
        }
        overwrite = true;
      }

      try {
        library = await importFilePair(
          libraryDir,
          library,
          { pdfFile: item.pdfFile, pptxFile: item.pptxFile },
          { overwrite },
        );

        if (aiTagNow && getApiKey() && item.pdfFile) {
          updateItemStatus(i, "tagging");
          const newRef = library.refs.find((r) => r.file_key === item.fileKey);
          if (newRef) {
            try {
              library = await runAiTagging(libraryDir, library, newRef.id);
            } catch (taggingErr) {
              const message =
                taggingErr instanceof AiTaggingUnauthorizedError
                  ? taggingErr.message
                  : "AI 태깅 실패(태그 없이 저장됨)";
              updateItemStatus(i, "done", message);
              continue;
            }
          }
        }

        updateItemStatus(i, "done");
      } catch (err) {
        updateItemStatus(
          i,
          "failed",
          err instanceof Error ? err.message : "변환에 실패했습니다.",
        );
      }
    }

    setBatchBusy(false);
  }

  if (checkingDir || !libraryDir) {
    return <LoadingScreen />;
  }

  if (needsPermission) {
    // 이 화면 안에서 바로 재연결(showDirectoryPicker 호출)하면 일부 브라우저에서
    // 불안정한 것이 확인되어, 설정 화면으로 보내 그쪽의 재연결 흐름을 타게 한다.
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-8">
        <p className="text-sm text-amber-600">
          브라우저를 재시작한 뒤에는 설정에서 라이브러리 폴더를 다시 선택해
          접근 권한을 갱신해야 합니다.
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link href="/" className="text-sm text-neutral-500 underline">
        ← 홈으로
      </Link>

      <h1 className="text-xl font-semibold">가져오기</h1>

      <div className="flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => setMode("single")}
          className={`px-4 py-2 text-sm ${mode === "single" ? "border-b-2 border-indigo-600 font-medium text-indigo-600" : "text-neutral-500"}`}
        >
          단일 가져오기
        </button>
        <button
          onClick={() => setMode("batch")}
          className={`px-4 py-2 text-sm ${mode === "batch" ? "border-b-2 border-indigo-600 font-medium text-indigo-600" : "text-neutral-500"}`}
        >
          일괄 가져오기
        </button>
      </div>

      {mode === "single" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <span>PDF 파일 (필수)</span>
            <div className="flex items-center gap-3 rounded border border-neutral-300 p-3">
              <input
                key={`pdf-${pdfInputKey}`}
                type="file"
                accept=".pdf"
                onChange={(e) =>
                  handleSinglePdfChange(e.target.files?.[0] ?? null)
                }
                className="flex-1 cursor-pointer text-sm text-neutral-600 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-indigo-700"
              />
              {singlePdf && (
                <button
                  type="button"
                  onClick={handleClearSinglePdf}
                  className="shrink-0 text-xs text-neutral-500 underline"
                >
                  지우기
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span>PPTX 파일 (선택)</span>
            <div className="flex items-center gap-3 rounded border border-neutral-300 p-3">
              <input
                key={`pptx-${pptxInputKey}`}
                type="file"
                accept=".pptx"
                onChange={(e) =>
                  handleSinglePptxChange(e.target.files?.[0] ?? null)
                }
                className="flex-1 cursor-pointer text-sm text-neutral-600 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-neutral-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-neutral-800"
              />
              {singlePptx && (
                <button
                  type="button"
                  onClick={handleClearSinglePptx}
                  className="shrink-0 text-xs text-neutral-500 underline"
                >
                  지우기
                </button>
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            제목
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            메모
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
              rows={3}
            />
          </label>

          <button
            onClick={handleSingleSubmit}
            disabled={singleBusy}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {singleBusy ? "가져오는 중..." : "가져오기"}
          </button>

          {singleProgress && (
            <p className="text-sm text-neutral-600">
              {singleProgress.current} / {singleProgress.total} 페이지
            </p>
          )}
          {singleMessage && <p className="text-sm">{singleMessage}</p>}
        </div>
      )}

      {mode === "batch" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <span>PDF/PPTX 파일 여러 개 선택</span>
            <div className="rounded border border-neutral-300 p-3">
              <input
                type="file"
                accept=".pdf,.pptx"
                multiple
                onChange={(e) => handleBatchFilesSelected(e.target.files)}
                className="w-full cursor-pointer text-sm text-neutral-600 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-indigo-700"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={aiTagNow && hasApiKey}
              disabled={!hasApiKey}
              onChange={(e) => setAiTagNow(e.target.checked)}
            />
            AI 태깅 지금 실행
            {!hasApiKey && (
              <span className="text-neutral-500">
                (설정에서 API 키를 등록하세요)
              </span>
            )}
          </label>

          {batchItems.length > 0 && (
            <ul className="flex flex-col gap-2">
              {batchItems.map((item) => (
                <li
                  key={item.fileKey}
                  className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm"
                >
                  <span>
                    {item.fileKey}
                    <span className="ml-2 text-xs text-neutral-500">
                      {item.pdfFile ? "PDF" : ""}
                      {item.pdfFile && item.pptxFile ? " + " : ""}
                      {item.pptxFile ? "PPTX" : ""}
                    </span>
                  </span>
                  <span>
                    {
                      {
                        pending: "대기",
                        converting: "변환 중",
                        tagging: "AI 태깅 중",
                        done: "완료",
                        failed: "실패",
                        skipped: "건너뜀",
                      }[item.status]
                    }
                    {item.error ? `: ${item.error}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleBatchStart}
            disabled={batchBusy || batchItems.length === 0}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {batchBusy ? "가져오는 중..." : "일괄 가져오기 시작"}
          </button>
        </div>
      )}
    </main>
  );
}
