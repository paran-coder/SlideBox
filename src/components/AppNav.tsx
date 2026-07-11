// 앱 전체(랜딩/소개/개인정보/라이브러리/가져오기/설정/상세)에서 공용으로 쓰는
// 단일 상단바. 어느 화면에서 보든 같은 링크·같은 스타일이어야 하므로 페이지별
// 특수 스타일(CTA 버튼 등)을 넣지 않는다. 가져오기 같은 페이지별 주요 액션은
// 여기 두지 않고 각 화면 자체의 툴바에 둔다.
import Link from "next/link";

export default function AppNav() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-8 pt-6 text-sm">
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
        <Link href="/" className="text-neutral-600 hover:text-neutral-900">
          라이브러리
        </Link>
        <Link href="/about" className="text-neutral-600 hover:text-neutral-900">
          소개
        </Link>
        <Link href="/privacy" className="text-neutral-600 hover:text-neutral-900">
          개인정보
        </Link>
        <Link href="/settings" className="text-neutral-600 hover:text-neutral-900">
          설정
        </Link>
      </nav>
    </header>
  );
}
