// 랜딩/소개/개인정보 페이지에서 공용으로 쓰는 상단 내비게이션.
import Link from "next/link";

export default function MarketingNav() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-sm">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white">
          S
        </span>
        슬라이드박스
      </Link>
      <nav className="flex items-center gap-5">
        <Link href="/about" className="text-neutral-600 hover:text-neutral-900">
          소개
        </Link>
        <Link href="/privacy" className="text-neutral-600 hover:text-neutral-900">
          개인정보
        </Link>
        <Link
          href="/settings"
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          시작하기
        </Link>
      </nav>
    </header>
  );
}
