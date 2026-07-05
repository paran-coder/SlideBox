// 스타일/레이아웃/주제 3축 태그 필터. 복수 선택 시 교집합(AND)으로 좁혀진다.
"use client";

import type { TagDef, TagKind } from "@/lib/library-json";

const KIND_LABELS: Record<TagKind, string> = {
  style: "스타일",
  layout: "레이아웃",
  topic: "주제",
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
        <div key={kind} className="flex flex-col gap-2">
          <p className="text-xs font-medium text-neutral-500">
            {KIND_LABELS[kind]}
          </p>
          <div className="flex flex-wrap gap-1">
            {tags
              .filter((t) => t.kind === kind)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selectedSet.has(t.id)
                      ? "border-black bg-black text-white"
                      : "border-neutral-300 text-neutral-600"
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
