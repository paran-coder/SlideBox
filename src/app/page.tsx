// 라이브러리 홈 — 슬라이드/파일 그리드, 검색, 3축 태그 필터.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isPermissionError, useLibraryDirectory } from "@/lib/library-dir";
import {
  readLibrary,
  type LibraryData,
  type RefEntry,
  type TagDef,
} from "@/lib/library-json";
import SearchBar from "@/components/SearchBar";
import TagFilter from "@/components/TagFilter";
import FileGrid from "@/components/FileGrid";
import SlideGrid, { type SlideGridItem } from "@/components/SlideGrid";
import PaginationBar, {
  PAGE_SIZE_OPTIONS,
} from "@/components/PaginationBar";

const DEFAULT_PAGE_SIZE = 30;
const FILE_PAGE_SIZE_KEY = "slidebox:file-page-size";
const SLIDE_PAGE_SIZE_KEY = "slidebox:slide-page-size";

function readStoredPageSize(key: string): number {
  const raw = window.localStorage.getItem(key);
  const parsed = raw ? Number(raw) : NaN;
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_PAGE_SIZE;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    dirHandle,
    loading: checkingDir,
    needsPermission,
  } = useLibraryDirectory();
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [permissionLost, setPermissionLost] = useState(false);
  // 보기 모드는 URL 쿼리(?view=)에 반영한다. 그래야 상세 화면으로 갔다가
  // 브라우저 뒤로 가기를 눌렀을 때 원래 보고 있던 보기 모드로 정확히 돌아온다
  // (컴포넌트 로컬 state로만 두면 페이지가 다시 마운트되며 기본값으로 리셋된다).
  const viewMode: "file" | "slide" =
    searchParams.get("view") === "slide" ? "slide" : "file";
  const [query, setQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [filePageSize, setFilePageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [slidePageSize, setSlidePageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [filePage, setFilePage] = useState(1);
  const [slidePage, setSlidePage] = useState(1);

  useEffect(() => {
    // localStorage는 클라이언트에서만 읽을 수 있어 SSR 결과(기본값)와 다를 수 있다.
    // 마운트 후 한 번만 갱신해 하이드레이션 불일치를 피한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilePageSizeState(readStoredPageSize(FILE_PAGE_SIZE_KEY));
    setSlidePageSizeState(readStoredPageSize(SLIDE_PAGE_SIZE_KEY));
  }, []);

  useEffect(() => {
    if (!checkingDir && !dirHandle) {
      router.replace("/settings");
    }
  }, [checkingDir, dirHandle, router]);

  // 검색어/태그 필터가 바뀌면 결과 목록이 달라지므로 페이지를 1로 되돌린다.
  // effect 대신 렌더링 도중 이전 값과 비교해 조정한다(React가 권장하는
  // "prop이 바뀌면 상태를 조정" 패턴 — 불필요한 리렌더 한 번을 줄인다).
  const [prevFilterKey, setPrevFilterKey] = useState(
    `${query}|${selectedTagIds.join(",")}`,
  );
  const filterKey = `${query}|${selectedTagIds.join(",")}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setFilePage(1);
    setSlidePage(1);
  }

  function setViewMode(mode: "file" | "slide") {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "file") {
      params.delete("view");
    } else {
      params.set("view", mode);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  function handleFilePageSizeChange(size: number) {
    setFilePageSizeState(size);
    setFilePage(1);
    window.localStorage.setItem(FILE_PAGE_SIZE_KEY, String(size));
  }

  function handleSlidePageSizeChange(size: number) {
    setSlidePageSizeState(size);
    setSlidePage(1);
    window.localStorage.setItem(SLIDE_PAGE_SIZE_KEY, String(size));
  }

  useEffect(() => {
    if (!dirHandle || needsPermission) return;
    (async () => {
      try {
        const data = await readLibrary(dirHandle);
        setLibrary(data);
        setLoadingLibrary(false);
      } catch (err) {
        if (isPermissionError(err)) {
          setPermissionLost(true);
          return;
        }
        console.error("라이브러리를 불러오지 못했습니다.", err);
      }
    })();
  }, [dirHandle, needsPermission]);

  const tagsById = useMemo(() => {
    const map = new Map<string, TagDef>();
    library?.tags.forEach((t) => map.set(t.id, t));
    return map;
  }, [library]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  }

  function matchesQuery(texts: string[]): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return texts.some((t) => t.toLowerCase().includes(q));
  }

  function tagNames(tagIds: string[]): string[] {
    return tagIds
      .map((id) => tagsById.get(id)?.name)
      .filter((name): name is string => Boolean(name));
  }

  const filteredRefs = useMemo<RefEntry[]>(() => {
    if (!library) return [];
    return library.refs.filter((ref) => {
      const textMatch = matchesQuery([
        ref.title,
        ref.memo,
        ...tagNames(ref.tag_ids),
      ]);
      const tagMatch = selectedTagIds.every((id) => ref.tag_ids.includes(id));
      return textMatch && tagMatch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, query, selectedTagIds, tagsById]);

  const filteredSlideItems = useMemo<SlideGridItem[]>(() => {
    if (!library) return [];
    const items: SlideGridItem[] = [];
    for (const ref of library.refs) {
      for (const slide of ref.slides) {
        const textMatch = matchesQuery([
          ref.title,
          ref.memo,
          ...tagNames(slide.tag_ids),
        ]);
        const tagMatch = selectedTagIds.every((id) =>
          slide.tag_ids.includes(id),
        );
        if (textMatch && tagMatch) {
          items.push({ ref, slide });
        }
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, query, selectedTagIds, tagsById]);

  const filePageCount = Math.max(
    1,
    Math.ceil(filteredRefs.length / filePageSize),
  );
  const pagedRefs = filteredRefs.slice(
    (filePage - 1) * filePageSize,
    filePage * filePageSize,
  );

  const slidePageCount = Math.max(
    1,
    Math.ceil(filteredSlideItems.length / slidePageSize),
  );
  const pagedSlideItems = filteredSlideItems.slice(
    (slidePage - 1) * slidePageSize,
    slidePage * slidePageSize,
  );

  if (checkingDir || !dirHandle) {
    return null;
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
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white"
        >
          설정으로 이동
        </Link>
      </main>
    );
  }

  if (loadingLibrary || !library) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={query} onChange={setQuery} />

        <div className="flex gap-1 rounded border border-neutral-300 p-1 text-sm">
          <button
            onClick={() => setViewMode("file")}
            className={`rounded px-3 py-1 ${
              viewMode === "file" ? "bg-black text-white" : ""
            }`}
          >
            파일 보기
          </button>
          <button
            onClick={() => setViewMode("slide")}
            className={`rounded px-3 py-1 ${
              viewMode === "slide" ? "bg-black text-white" : ""
            }`}
          >
            슬라이드 보기
          </button>
        </div>

        <Link
          href="/import"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          가져오기
        </Link>
        <Link href="/settings" className="text-sm text-neutral-500 underline">
          설정
        </Link>
      </div>

      <TagFilter
        tags={library.tags}
        selectedIds={selectedTagIds}
        onToggle={toggleTag}
      />

      {library.refs.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-500">
          아직 가져온 레퍼런스가 없습니다.{" "}
          <Link href="/import" className="underline">
            가져오기
          </Link>
          에서 PDF를 추가해 보세요.
        </p>
      ) : viewMode === "file" ? (
        <>
          <FileGrid dirHandle={dirHandle} refs={pagedRefs} tagsById={tagsById} />
          <PaginationBar
            page={filePage}
            pageCount={filePageCount}
            pageSize={filePageSize}
            totalCount={filteredRefs.length}
            onPageChange={setFilePage}
            onPageSizeChange={handleFilePageSizeChange}
          />
        </>
      ) : (
        <>
          <SlideGrid
            dirHandle={dirHandle}
            items={pagedSlideItems}
            tagsById={tagsById}
          />
          <PaginationBar
            page={slidePage}
            pageCount={slidePageCount}
            pageSize={slidePageSize}
            totalCount={filteredSlideItems.length}
            onPageChange={setSlidePage}
            onPageSizeChange={handleSlidePageSizeChange}
          />
        </>
      )}
    </main>
  );
}
