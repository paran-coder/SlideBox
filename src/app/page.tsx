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
import LoadingScreen from "@/components/LoadingScreen";
import Landing from "@/components/Landing";

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
  // 보기 모드/검색어/태그 필터를 전부 URL 쿼리(?view=&q=&tags=)에 반영한다. 그래야
  // 상세 화면으로 갔다가 브라우저 뒤로 가기를 눌렀을 때 원래 보고 있던 상태로
  // 정확히 돌아온다(컴포넌트 로컬 state로만 두면 페이지가 다시 마운트되며
  // 기본값으로 리셋된다).
  const viewMode: "file" | "slide" =
    searchParams.get("view") === "slide" ? "slide" : "file";
  const selectedTagIds = useMemo(() => {
    const raw = searchParams.get("tags");
    return raw ? raw.split(",").filter(Boolean) : [];
  }, [searchParams]);
  // 검색어는 입력 중 매 타이핑마다 URL을 갱신하면 버벅이므로 로컬 state로 즉시
  // 반영하고, 잠깐 멈췄을 때만 URL에 동기화한다(아래 디바운스 effect).
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

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

  function updateSearchParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  function setViewMode(mode: "file" | "slide") {
    updateSearchParams({ view: mode === "file" ? null : mode });
  }

  // 검색어를 잠깐 멈췄을 때만 URL에 반영한다(타이핑 도중 매번 반영하면 버벅인다).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      updateSearchParams({ q: query || null });
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
    const handleRef = dirHandle;

    async function loadLibrary(handle: FileSystemDirectoryHandle) {
      try {
        const data = await readLibrary(handle);
        setLibrary(data);
        setLoadingLibrary(false);
      } catch (err) {
        if (isPermissionError(err)) {
          setPermissionLost(true);
          return;
        }
        console.error("라이브러리를 불러오지 못했습니다.", err);
      }
    }

    loadLibrary(handleRef);

    // 상세 화면에서 태그를 추가/수정하고 브라우저 뒤로 가기로 돌아왔을 때, 이
    // 컴포넌트가 다시 마운트되지 않고 재사용되면 위 최초 로드만으로는 방금 바뀐
    // 내용이 반영되지 않을 수 있다. 탭이 다시 보이거나 포커스를 받을 때마다
    // 한 번 더 읽어와 이런 경우를 방어한다.
    function handleVisible() {
      if (document.visibilityState === "visible") {
        loadLibrary(handleRef);
      }
    }
    // popstate: 같은 탭 안에서 브라우저 뒤로/앞으로 가기로 돌아왔을 때 발생한다.
    window.addEventListener("focus", handleVisible);
    window.addEventListener("popstate", handleVisible);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener("focus", handleVisible);
      window.removeEventListener("popstate", handleVisible);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [dirHandle, needsPermission]);

  const tagsById = useMemo(() => {
    const map = new Map<string, TagDef>();
    library?.tags.forEach((t) => map.set(t.id, t));
    return map;
  }, [library]);

  function toggleTag(tagId: string) {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    updateSearchParams({ tags: next.length > 0 ? next.join(",") : null });
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
      // 파일 보기여도 "이 파일 안에 이 태그가 있다"고 느껴지는 게 자연스러우므로,
      // 파일 자체의 태그뿐 아니라 그 안의 슬라이드에 붙은 태그도 함께 본다.
      const allTagIds = [
        ...ref.tag_ids,
        ...ref.slides.flatMap((s) => s.tag_ids),
      ];
      const textMatch = matchesQuery([
        ref.title,
        ref.memo,
        ...tagNames(allTagIds),
      ]);
      const tagMatch = selectedTagIds.every((id) => allTagIds.includes(id));
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

  if (checkingDir) {
    return <LoadingScreen />;
  }

  // 폴더를 한 번도 연결한 적 없는 방문자에게는 리다이렉트 대신 랜딩 화면을 보여준다.
  if (!dirHandle) {
    return <Landing />;
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
    return <LoadingScreen />;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={query} onChange={setQuery} />

        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <div className="flex gap-1 rounded border border-neutral-300 p-1 text-sm">
            <button
              onClick={() => setViewMode("file")}
              className={`rounded px-3 py-1 transition-colors ${
                viewMode === "file"
                  ? "bg-indigo-600 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              파일 보기
            </button>
            <button
              onClick={() => setViewMode("slide")}
              className={`rounded px-3 py-1 transition-colors ${
                viewMode === "slide"
                  ? "bg-indigo-600 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              슬라이드 보기
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="text-sm text-neutral-500 hover:text-neutral-800"
            >
              설정
            </Link>
            <Link
              href="/import"
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
            >
              가져오기
            </Link>
          </div>
        </div>
      </div>

      <TagFilter
        tags={library.tags}
        selectedIds={selectedTagIds}
        onToggle={toggleTag}
      />

      {library.refs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            className="text-neutral-300"
          >
            <path
              d="M4 4h9l7 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M13 4v7h7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="text-sm font-medium text-neutral-700">
            아직 가져온 레퍼런스가 없습니다
          </p>
          <p className="max-w-xs text-sm text-neutral-500">
            PDF/PPTX 파일을 가져오면 슬라이드별 썸네일과 태그로 정리할 수
            있습니다.
          </p>
          <Link
            href="/import"
            className="mt-2 rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            파일 가져오기
          </Link>
        </div>
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
