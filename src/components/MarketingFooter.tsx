// 랜딩/소개/개인정보 페이지에서 공용으로 쓰는 하단 푸터.
import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="mx-auto w-full max-w-5xl border-t border-neutral-200 px-6 py-8 text-sm text-neutral-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>슬라이드박스 — 서버 없이 브라우저에서 로컬 폴더를 직접 다루는 개인용 도구</p>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-neutral-800">
            소개
          </Link>
          <Link href="/privacy" className="hover:text-neutral-800">
            개인정보
          </Link>
        </div>
      </div>
    </footer>
  );
}
