// 파일 단위 그리드 — 대표 썸네일(1페이지) + 제목 + 파일 태그 카드.
"use client";

import Link from "next/link";
import { useThumbUrl } from "@/lib/thumb-url";
import type { RefEntry, TagDef } from "@/lib/library-json";

interface FileCardProps {
  dirHandle: FileSystemDirectoryHandle;
  refEntry: RefEntry;
  tagsById: Map<string, TagDef>;
}

function FileCard({ dirHandle, refEntry, tagsById }: FileCardProps) {
  const coverThumb = refEntry.slides[0]?.thumb ?? null;
  const url = useThumbUrl(dirHandle, coverThumb);

  return (
    <Link
      href={`/refs/${refEntry.id}`}
      className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-2 shadow-sm transition-shadow hover:border-neutral-300 hover:shadow-md"
    >
      <div className="aspect-video overflow-hidden rounded bg-neutral-100">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={refEntry.title}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{refEntry.title}</p>
        {refEntry.has_pptx && (
          <span
            className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
            title="PPTX 보유"
          >
            PPTX
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {refEntry.tag_ids.map((id) => {
          const tag = tagsById.get(id);
          if (!tag) return null;
          return (
            <span
              key={id}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs"
            >
              {tag.name}
            </span>
          );
        })}
      </div>
    </Link>
  );
}

interface FileGridProps {
  dirHandle: FileSystemDirectoryHandle;
  refs: RefEntry[];
  tagsById: Map<string, TagDef>;
}

export default function FileGrid({ dirHandle, refs, tagsById }: FileGridProps) {
  if (refs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-neutral-500">
        표시할 항목이 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {refs.map((refEntry) => (
        <FileCard
          key={refEntry.id}
          dirHandle={dirHandle}
          refEntry={refEntry}
          tagsById={tagsById}
        />
      ))}
    </div>
  );
}
