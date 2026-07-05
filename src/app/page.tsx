// 라이브러리 홈 — 슬라이드/파일 그리드, 검색, 3축 태그 필터.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLibraryDirectory } from "@/lib/library-dir";
import {
  readLibrary,
  type LibraryData,
  type RefEntry,
  type SlideEntry,
  type TagDef,
} from "@/lib/library-json";
import SearchBar from "@/components/SearchBar";
import TagFilter from "@/components/TagFilter";
import FileGrid from "@/components/FileGrid";
import SlideGrid, { type SlideGridItem } from "@/components/SlideGrid";

export default function HomePage() {
  const router = useRouter();
  const [dirHandle, setDirHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"file" | "slide">("slide");
  const [query, setQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const handle = await getLibraryDirectory();
      if (!handle) {
        router.replace("/settings");
        return;
      }
      setDirHandle(handle);
      const data = await readLibrary(handle);
      setLibrary(data);
      setLoading(false);
    })();
  }, [router]);

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

  if (loading || !library || !dirHandle) {
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
        <FileGrid dirHandle={dirHandle} refs={filteredRefs} tagsById={tagsById} />
      ) : (
        <SlideGrid
          dirHandle={dirHandle}
          items={filteredSlideItems}
          tagsById={tagsById}
        />
      )}
    </main>
  );
}
