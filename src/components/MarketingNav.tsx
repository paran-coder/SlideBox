// 랜딩/소개/개인정보 페이지에서 공용으로 쓰는 상단 내비게이션.
// 폴더 연결 여부에 따라 CTA 버튼이 "시작하기"/"라이브러리로 이동"으로 바뀐다.
"use client";

import Link from "next/link";
import { useLibraryDirectory } from "@/lib/library-dir";

export default function MarketingNav() {
  const { dirHandle, loading } = useLibraryDirectory();
  const connected = !loading && Boolean(dirHandle);
  const ctaHref = connected ? "/" : "/settings";
  const ctaLabel = connected ? "라이브러리로 이동" : "시작하기";

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-sm">
      <Link href="/home" className="flex items-center gap-2 font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white">
          S
        </span>
        슬라이드박스
      </Link>
      <nav className="flex items-center gap-5">
        <Link href="/home" className="text-neutral-600 hover:text-neutral-900">
          홈
        </Link>
        <Link href="/about" className="text-neutral-600 hover:text-neutral-900">
          소개
        </Link>
        <Link href="/privacy" className="text-neutral-600 hover:text-neutral-900">
          개인정보
        </Link>
        <Link
          href={ctaHref}
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          {ctaLabel}
        </Link>
      </nav>
    </header>
  );
}
