// 개인정보 처리 방식 안내 — 이 앱에 서버가 없다는 것과 실제 데이터 흐름을 투명하게 설명한다.
import AppNav from "@/components/AppNav";
import MarketingFooter from "@/components/MarketingFooter";

export const metadata = {
  title: "개인정보",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-24 pt-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">개인정보</h1>
          <p className="mt-2 text-sm text-neutral-600">
            슬라이드박스는 운영자 서버가 없는 로컬 전용 도구입니다. 여기 적힌
            내용은 코드로 확인 가능한 사실 그대로입니다.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">운영자 서버로 전송되는 것</h2>
          <p className="text-sm text-neutral-600">
            없습니다. 이 앱에는 애초에 백엔드 서버가 존재하지 않습니다. PDF/PPTX
            원본, 썸네일, 태그, 메모는 모두 사용자가 선택한 로컬 폴더 안에만
            저장되며, 브라우저가 그 폴더를 직접 읽고 씁니다.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">외부로 전송되는 유일한 경우</h2>
          <p className="text-sm text-neutral-600">
            &ldquo;AI 태깅&rdquo; 기능을 실행할 때만, 슬라이드 썸네일 이미지와
            태그 사전 텍스트가 사용자 본인이 설정에서 등록한 Anthropic API
            키로 <code className="rounded bg-neutral-100 px-1">api.anthropic.com</code>에
            브라우저에서 직접 전송됩니다. 이 요청은 운영자 서버를 거치지
            않으며, 응답으로 받은 태그만 로컬 라이브러리에 저장됩니다.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">API 키 보관</h2>
          <p className="text-sm text-neutral-600">
            등록한 Anthropic API 키는 브라우저의 localStorage에만 저장됩니다.
            운영자를 포함해 이 앱의 어디로도 전송되지 않으며, 설정 화면에서
            언제든지 삭제할 수 있습니다.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">계정·로그인</h2>
          <p className="text-sm text-neutral-600">
            회원가입이나 로그인이 없습니다. 브라우저와 선택한 폴더의 조합이
            곧 &ldquo;계정&rdquo;이며, 다른 브라우저나 기기에서는 같은
            폴더를 다시 선택해야 접근할 수 있습니다.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">쿠키·트래킹</h2>
          <p className="text-sm text-neutral-600">
            분석·광고 목적의 쿠키나 트래킹 스크립트를 사용하지 않습니다.
          </p>
        </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
