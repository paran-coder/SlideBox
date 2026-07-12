// 슬라이드 단위 그리드 — 낱장 썸네일을 격자로 표시(가운데 정렬).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useThumbUrl } from "@/lib/thumb-url";
import { getSlideHoverZoomEnabled } from "@/lib/ui-prefs";
import type { RefEntry, SlideEntry, TagDef } from "@/lib/library-json";

export interface SlideGridItem {
  ref: RefEntry;
  slide: SlideEntry;
}

interface SlideCardProps {
  dirHandle: FileSystemDirectoryHandle;
  item: SlideGridItem;
  tagsById: Map<string, TagDef>;
  hoverZoomEnabled: boolean;
}

function SlideCard({ dirHandle, item, tagsById, hoverZoomEnabled }: SlideCardProps) {
  const url = useThumbUrl(dirHandle, item.slide.thumb);

  return (
    <Link
      href={`/refs/${item.ref.id}`}
      className={`group relative flex flex-col gap-1 rounded-lg border border-neutral-200 p-2 shadow-sm transition-shadow hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
        hoverZoomEnabled ? "hover:z-20" : ""
      }`}
    >
      <div
        className={`overflow-hidden rounded bg-neutral-100 shadow-none transition-transform duration-150 ease-out motion-reduce:transition-none ${
          hoverZoomEnabled ? "group-hover:scale-[3] group-hover:shadow-2xl" : ""
        }`}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${item.ref.title} p${item.slide.page_no}`}
            className="aspect-video w-full object-cover"
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
  const [hoverZoomEnabled, setHoverZoomEnabled] = useState(true);

  useEffect(() => {
    // localStorage는 클라이언트에서만 읽을 수 있어 SSR 결과(기본값)와 다를 수 있다.
    // 마운트 후 한 번만 갱신해 하이드레이션 불일치를 피한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoverZoomEnabled(getSlideHoverZoomEnabled());
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          className="text-neutral-300"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="m20 20-3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-sm text-neutral-500">
          조건에 맞는 항목이 없습니다. 검색어나 태그 필터를 조정해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <SlideCard
          key={`${item.ref.id}-${item.slide.page_no}`}
          dirHandle={dirHandle}
          item={item}
          tagsById={tagsById}
          hoverZoomEnabled={hoverZoomEnabled}
        />
      ))}
    </div>
  );
}
