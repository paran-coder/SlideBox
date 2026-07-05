// 페이지 이동 + 페이지당 개수(10/30/50/100) 선택 컨트롤.
"use client";

export const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;

interface PaginationBarProps {
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function PaginationBar({
  page,
  pageCount,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-600">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40"
        >
          이전
        </button>
        <span>
          {page} / {pageCount}
        </span>
        <button
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40"
        >
          다음
        </button>
        <span className="text-neutral-400">총 {totalCount}개</span>
      </div>

      <label className="flex items-center gap-1">
        페이지당
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded border border-neutral-300 px-1 py-1"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}개
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
