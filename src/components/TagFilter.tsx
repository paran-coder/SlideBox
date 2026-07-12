// 스타일/레이아웃/주제 3축 태그 필터. 복수 선택 시 교집합(AND)으로 좁혀진다.
"use client";

import type { TagDef, TagKind } from "@/lib/library-json";

const KIND_LABELS: Record<TagKind, string> = {
  style: "스타일",
  layout: "레이아웃",
  topic: "주제",
};

// 그룹별로 배경/제목 색을 다르게 줘서 스타일·레이아웃·주제를 한눈에 구분한다.
const KIND_STYLES: Record<TagKind, { bg: string; title: string }> = {
  style: { bg: "bg-blue-50", title: "text-blue-700" },
  layout: { bg: "bg-violet-50", title: "text-violet-700" },
  topic: { bg: "bg-amber-50", title: "text-amber-700" },
};

const KINDS: TagKind[] = ["style", "layout", "topic"];

interface TagFilterProps {
  tags: TagDef[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
}

export default function TagFilter({ tags, selectedIds, onToggle }: TagFilterProps) {
  const selectedSet = new Set(selectedIds);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {KINDS.map((kind) => (
        <div
          key={kind}
          className={`flex flex-col gap-2 rounded-lg p-3 ${KIND_STYLES[kind].bg}`}
        >
          <p className={`text-xs font-semibold ${KIND_STYLES[kind].title}`}>
            {KIND_LABELS[kind]}
          </p>
          <div className="flex flex-wrap gap-1">
            {tags
              .filter((t) => t.kind === kind)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                    selectedSet.has(t.id)
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  {t.name}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
