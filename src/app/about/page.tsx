// 소개/작동 원리 안내 — 서버 없는 로컬-전용 구조를 처음 온 사용자에게 설명한다.
import Link from "next/link";
import AppNav from "@/components/AppNav";

export const metadata = {
  title: "소개",
};

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-24 pt-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">슬라이드박스는 이렇게 동작합니다</h1>
          <p className="mt-2 text-sm text-neutral-600">
            PPT 레퍼런스를 모아놓고 태그로 찾기 위한 개인용 도구입니다. 흔한
            SaaS와 달리 서버·계정이 없는 구조라, 낯설 수 있는 부분을
            정리했습니다.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">왜 서버가 없나요?</h2>
          <p className="text-sm text-neutral-600">
            PPT 레퍼런스는 대부분 개인 컴퓨터 안에만 있으면 충분하고,
            굳이 클라우드에 올려 관리할 필요가 없다고 판단했습니다. 그래서
            브라우저가 &ldquo;File System Access API&rdquo;라는 기능으로
            사용자가 선택한 로컬 폴더를 직접 읽고 쓰는 방식을 택했습니다.
            서버가 없으니 계정도, 요금제도 없습니다.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">내 데이터는 어디에 저장되나요?</h2>
          <p className="text-sm text-neutral-600">
            처음 연결한 로컬 폴더 안입니다. 가져온 PDF/PPTX 원본은 그 폴더
            최상위에, 자동 생성된 슬라이드 썸네일은{" "}
            <code className="rounded bg-neutral-100 px-1">thumbs/</code>{" "}
            서브폴더에, 태그·메모 등 라이브러리 정보는{" "}
            <code className="rounded bg-neutral-100 px-1">library.json</code>{" "}
            파일 하나에 저장됩니다. 폴더를 다른 기기로 옮기거나 백업하면
            그대로 라이브러리 전체가 이동합니다.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">AI 태깅은 어떻게 동작하나요?</h2>
          <p className="text-sm text-neutral-600">
            설정에서 본인의 Anthropic API 키를 등록하면(BYOK, Bring Your Own
            Key), 브라우저가 슬라이드 이미지를 Anthropic API에 직접
            전송해 태그를 추천받습니다. 이 요청은 슬라이드박스 서버를
            거치지 않고, 비용도 사용자 본인의 Anthropic 계정으로 직접
            청구됩니다.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">왜 Chrome/Edge만 지원하나요?</h2>
          <p className="text-sm text-neutral-600">
            로컬 폴더에 직접 접근하는 File System Access API는 현재
            Chromium 기반 데스크톱 브라우저(Chrome, Edge)에서만 지원됩니다.
            Firefox, Safari, 모바일 브라우저에서는 이 방식 자체가
            동작하지 않습니다.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            href="/settings"
            className="rounded bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            시작하기
          </Link>
          <Link
            href="/privacy"
            className="rounded border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            개인정보 보기
          </Link>
        </div>
        </div>
      </main>
    </div>
  );
}
