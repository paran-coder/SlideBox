// 슬라이드 단위 그리드 — 낱장 썸네일을 Pinterest식(masonry)으로 표시.
"use client";

import Link from "next/link";
import { useThumbUrl } from "@/lib/thumb-url";
import type { RefEntry, SlideEntry, TagDef } from "@/lib/library-json";

export interface SlideGridItem {
  ref: RefEntry;
  slide: SlideEntry;
}

interface SlideCardProps {
  dirHandle: FileSystemDirectoryHandle;
  item: SlideGridItem;
  tagsById: Map<string, TagDef>;
}

function SlideCard({ dirHandle, item, tagsById }: SlideCardProps) {
  const url = useThumbUrl(dirHandle, item.slide.thumb);

  return (
    <Link
      href={`/refs/${item.ref.id}`}
      className="group relative flex flex-col gap-1 rounded-lg border border-neutral-200 p-2 hover:z-20 hover:border-neutral-400"
    >
      <div className="overflow-hidden rounded bg-neutral-100 shadow-none transition-transform duration-150 ease-out group-hover:scale-[3] group-hover:shadow-2xl">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${item.ref.title} p${item.slide.page_no}`}
            className="w-full object-cover"
          />
        )}
      </div>
      <p className="truncate text-xs text-neutral-500">
        {item.ref.title} · {item.slide.page_no}p
      </p>
      <div className="flex flex-wrap gap-1">
        {item.slide.tag_ids.map((id) => {
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

interface SlideGridProps {
  dirHandle: FileSystemDirectoryHandle;
  items: SlideGridItem[];
  tagsById: Map<string, TagDef>;
}

export default function SlideGrid({ dirHandle, items, tagsById }: SlideGridProps) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-neutral-500">
        표시할 항목이 없습니다.
      </p>
    );
  }

  return (
    <div className="columns-2 gap-4 sm:columns-3 md:columns-4">
      {items.map((item) => (
        <div
          key={`${item.ref.id}-${item.slide.page_no}`}
          className="mb-4 break-inside-avoid"
        >
          <SlideCard dirHandle={dirHandle} item={item} tagsById={tagsById} />
        </div>
      ))}
    </div>
  );
}
