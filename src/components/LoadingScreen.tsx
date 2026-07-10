// 데이터 로딩 중 빈 화면 대신 보여주는 최소 스켈레톤.
export default function LoadingScreen() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-full max-w-sm animate-pulse rounded bg-neutral-100" />
        <div className="h-9 w-40 animate-pulse rounded bg-neutral-100" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-video animate-pulse rounded-lg bg-neutral-100"
          />
        ))}
      </div>
    </main>
  );
}
