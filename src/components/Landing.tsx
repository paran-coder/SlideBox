// 라이브러리 폴더가 아직 연결되지 않은 방문자에게 보여주는 랜딩 화면.
import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";

const FEATURES = [
  {
    title: "자동 슬라이드 변환",
    body: "PDF/PPTX를 가져오면 페이지별 썸네일로 자동 분해해 한눈에 훑어볼 수 있습니다.",
  },
  {
    title: "3축 태그 필터",
    body: "스타일·레이아웃·주제로 태그를 붙이고, 여러 개를 동시에 선택해 교집합으로 좁힙니다.",
  },
  {
    title: "AI 자동 태깅 (BYOK)",
    body: "직접 등록한 Anthropic API 키로 브라우저에서 바로 태깅을 요청합니다. 중간 서버가 없습니다.",
  },
  {
    title: "완전 로컬 저장",
    body: "모든 파일과 라이브러리 정보는 선택한 내 컴퓨터 폴더 안에만 저장됩니다.",
  },
];

const STEPS = [
  { n: "1", title: "폴더 선택", body: "레퍼런스를 모아둘 로컬 폴더를 한 번 지정합니다." },
  { n: "2", title: "가져오기", body: "PDF/PPTX를 가져오면 슬라이드 썸네일로 자동 변환됩니다." },
  { n: "3", title: "태그로 찾기", body: "스타일·레이아웃·주제 태그와 검색으로 원하는 슬라이드를 바로 찾습니다." },
];

const FAQS = [
  {
    q: "회원가입이 필요한가요?",
    a: "아니요. 로그인도 회원가입도 없습니다. 브라우저에서 로컬 폴더 하나를 선택하면 바로 사용할 수 있습니다.",
  },
  {
    q: "제 PPT 파일이 서버에 올라가나요?",
    a: "올라가지 않습니다. 이 앱에는 애초에 서버가 없고, 선택한 폴더 안의 파일만 브라우저가 직접 읽고 씁니다. 자세한 내용은 개인정보 페이지를 참고하세요.",
  },
  {
    q: "어떤 브라우저에서 쓸 수 있나요?",
    a: "폴더에 직접 접근하는 기능(File System Access API)을 지원하는 Chrome 또는 Edge 데스크톱 브라우저가 필요합니다.",
  },
  {
    q: "AI 태깅에 비용이 드나요?",
    a: "앱 사용 자체는 무료입니다. AI 태깅 기능을 쓰려면 본인의 Anthropic API 키를 등록해야 하고, 그 사용량만큼 Anthropic에 직접 과금됩니다.",
  },
];

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <MarketingNav />

      <main className="flex flex-1 flex-col gap-24 px-6 pb-24 pt-8">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            내 컴퓨터 안의 PPT를
            <br />
            정리된 레퍼런스 라이브러리로
          </h1>
          <p className="max-w-xl text-neutral-600">
            PDF/PPTX를 가져오면 슬라이드별로 자동 변환되고, 스타일·레이아웃·주제
            태그로 정리됩니다. 서버 없이 브라우저에서 내 폴더를 직접 다룹니다.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/settings"
              className="rounded bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              시작하기
            </Link>
            <Link
              href="/about"
              className="rounded border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              작동 원리 보기
            </Link>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-neutral-200 p-5 shadow-sm"
            >
              <p className="font-medium">{f.title}</p>
              <p className="mt-2 text-sm text-neutral-600">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto w-full max-w-4xl">
          <h2 className="text-center text-2xl font-semibold">작동 방식</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                  {s.n}
                </div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-neutral-600">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
          <p className="font-medium">파일은 오직 내 컴퓨터에만 저장됩니다</p>
          <p className="max-w-lg text-sm text-neutral-600">
            운영자 서버가 없어서, PDF/PPTX와 라이브러리 정보를 아무 데도 업로드하지
            않습니다. AI 태깅을 쓸 때만 슬라이드 이미지가 사용자 본인의 API 키로
            Anthropic에 직접 전송됩니다.
          </p>
          <Link href="/privacy" className="text-sm text-indigo-600 underline">
            개인정보 처리 방식 자세히 보기
          </Link>
        </section>

        <section className="mx-auto w-full max-w-2xl">
          <h2 className="text-center text-2xl font-semibold">자주 묻는 질문</h2>
          <div className="mt-8 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-4">
                <summary className="cursor-pointer list-none font-medium marker:content-none">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-neutral-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
          <p className="text-xl font-semibold">지금 폴더 하나만 연결하면 바로 시작할 수 있습니다</p>
          <Link
            href="/settings"
            className="rounded bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
          >
            시작하기
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
