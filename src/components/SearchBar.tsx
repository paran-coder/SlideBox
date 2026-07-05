// 제목·메모·태그 이름을 한 번에 검색하는 검색창.
"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="제목, 메모, 태그로 검색"
      className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2 text-sm"
    />
  );
}
