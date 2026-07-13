// 존재하지 않는 경로로 접근했을 때 보여주는 커스텀 404 화면.
import Link from "next/link";
import Logo from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Logo className="h-12 w-12" />
      <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="max-w-sm text-sm text-neutral-600">
        주소가 잘못됐거나 삭제된 페이지입니다.
      </p>
      <Link
        href="/"
        className="mt-2 rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
      >
        홈으로 이동
      </Link>
    </main>
  );
}
