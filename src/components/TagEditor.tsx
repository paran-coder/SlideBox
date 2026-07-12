// 태그 칩 편집기 — 태그 추가/제거, 새 태그 생성. AI 초안 태그는 점선 테두리로 구분한다.
"use client";

import { useEffect, useRef, useState } from "react";
import type { TagDef, TagKind } from "@/lib/library-json";

const KIND_LABELS: Record<TagKind, string> = {
  style: "스타일",
  layout: "레이아웃",
  topic: "주제",
};

const KINDS: TagKind[] = ["style", "layout", "topic"];

interface TagEditorProps {
  allTags: TagDef[];
  assignedTagIds: string[];
  aiTagIds: string[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreateTag: (name: string, kind: TagKind) => void;
}

export default function TagEditor({
  allTags,
  assignedTagIds,
  aiTagIds,
  onAdd,
  onRemove,
  onCreateTag,
}: TagEditorProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagKind, setNewTagKind] = useState<TagKind>("style");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const tagsById = new Map(allTags.map((t) => [t.id, t]));
  const assignedSet = new Set(assignedTagIds);
  const aiSet = new Set(aiTagIds);
  const availableTags = allTags.filter((t) => !assignedSet.has(t.id));

  function handleCreate() {
    const name = newTagName.trim();
    if (!name) return;
    onCreateTag(name, newTagKind);
    setNewTagName("");
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {assignedTagIds.map((id) => {
          const tag = tagsById.get(id);
          if (!tag) return null;
          const isAiDraft = aiSet.has(id);
          return (
            <span
              key={id}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                isAiDraft
                  ? "border border-dashed border-neutral-400 text-neutral-600"
                  : "bg-neutral-100"
              }`}
            >
              {tag.name}
              <button
                onClick={() => onRemove(id)}
                aria-label={`${tag.name} 태그 제거`}
                className="rounded text-neutral-400 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              >
                ×
              </button>
            </span>
          );
        })}

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          + 태그
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-3 rounded border border-neutral-200 p-3">
          {KINDS.map((kind) => {
            const options = availableTags.filter((t) => t.kind === kind);
            if (options.length === 0) return null;
            return (
              <div key={kind} className="flex flex-col gap-1">
                <p className="text-xs font-medium text-neutral-500">
                  {KIND_LABELS[kind]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {options.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onAdd(t.id)}
                      className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2 border-t border-neutral-200 pt-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="새 태그 이름"
              className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
            />
            <select
              value={newTagKind}
              onChange={(e) => setNewTagKind(e.target.value as TagKind)}
              className="rounded border border-neutral-300 px-2 py-1 text-xs"
            >
              <option value="style">스타일</option>
              <option value="layout">레이아웃</option>
              <option value="topic">주제</option>
            </select>
            <button
              onClick={handleCreate}
              className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
