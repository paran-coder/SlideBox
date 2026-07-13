// 슬라이드가 겹쳐 쌓인 모습을 형상화한 로고 마크(브랜드 accent 색인 인디고 계열).
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="19" height="14" rx="2.5" fill="#c7d2fe" />
      <rect x="5.5" y="7" width="19" height="14" rx="2.5" fill="#818cf8" />
      <rect x="8" y="9" width="19" height="14" rx="2.5" fill="#4f46e5" />
    </svg>
  );
}
