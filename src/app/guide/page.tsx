// 사용법 안내 — 화면마다 흩어져 있는 기능(특히 설정에 숨어 있는 옵션)을 한 곳에서 정리한다.
import Link from "next/link";
import AppNav from "@/components/AppNav";

export const metadata = {
  title: "사용법",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Item({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-neutral-600">{children}</p>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppNav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-24 pt-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold">사용법</h1>
            <p className="mt-2 text-sm text-neutral-600">
              화면마다 흩어져 있는 기능, 특히 설정에만 있어서 찾기 어려운
              옵션들을 한 곳에 모았습니다. 작동 원리 자체가 궁금하면{" "}
              <Link href="/about" className="text-indigo-600 underline">
                소개
              </Link>{" "}
              페이지를 참고하세요.
            </p>
          </div>

          <Section title="시작하기">
            <Item title="폴더 연결">
              설정에서 &ldquo;라이브러리 폴더 선택&rdquo;을 누르면 그
              폴더 안의 파일들이 라이브러리가 됩니다. PDF/PPTX를 이미
              모아둔 폴더를 그대로 골라도 되고, 새 폴더를 만들어도
              됩니다.
            </Item>
            <Item title="브라우저 재시작 후">
              브라우저를 완전히 껐다 켜면 접근 권한이 초기화됩니다.
              호박색 안내와 함께 뜨는 &ldquo;이 폴더 접근 허용&rdquo;
              버튼만 누르면 되고, 폴더를 다시 고를 필요는 없습니다.
            </Item>
          </Section>

          <Section title="가져오기">
            <Item title="단일/일괄 모드">
              PDF 한 개씩 가져올 수도 있고, 여러 PDF/PPTX를 한 번에
              선택해 일괄로 가져올 수도 있습니다. 같은 이름의 PDF와
              PPTX는 자동으로 하나의 레퍼런스로 묶입니다.
            </Item>
            <Item title="AI 태깅 지금 실행">
              일괄 가져오기 화면에서 이 체크박스를 켜두면, 가져오는
              즉시 AI가 태그 초안을 붙여줍니다(설정에 API 키가 등록돼
              있어야 활성화됩니다).
            </Item>
            <Item title="용량 제한">
              파일당 50MB를 넘으면 가져오기 전에 안내와 함께 막힙니다.
            </Item>
          </Section>

          <Section title="홈 화면(라이브러리)">
            <Item title="파일 보기 / 슬라이드 보기">
              파일 보기는 레퍼런스 단위, 슬라이드 보기는 낱장 슬라이드
              단위로 훑어봅니다. 파일 보기에서도 그 안의 슬라이드에
              달린 태그까지 검색·필터에 함께 반영됩니다.
            </Item>
            <Item title="슬라이드 확대 미리보기 끄고 켜기">
              슬라이드 보기에서 마우스를 올리면 이미지가 크게 확대되는
              기능입니다. 이 동작이 불편하면{" "}
              <Link href="/settings" className="text-indigo-600 underline">
                설정 → 화면 표시
              </Link>{" "}
              에서 체크박스로 끌 수 있습니다.
            </Item>
            <Item title="태그 필터">
              스타일·레이아웃·주제 3개 축에서 태그를 골라 좁혀갈 수
              있고, 여러 개를 동시에 선택하면 전부 만족하는 것만
              (교집합) 남습니다.
            </Item>
            <Item title="페이지당 개수">
              그리드 아래 페이지네이션에서 10/30/50/100개 중 고를 수
              있고, 이 설정은 파일 보기·슬라이드 보기 각각 따로
              기억됩니다.
            </Item>
          </Section>

          <Section title="상세 화면">
            <Item title="자동 저장">
              제목·메모·태그는 별도 저장 버튼 없이 칸 밖을 클릭하는
              순간(또는 태그를 추가/제거하는 순간) 바로 저장되고,
              화면 아래에 &ldquo;저장됨&rdquo;이 잠깐 표시됩니다.
            </Item>
            <Item title="점선 테두리 태그">
              AI가 자동으로 붙인 초안 태그는 점선 테두리로 표시됩니다.
              직접 확인하고 필요 없으면 지우면 됩니다.
            </Item>
            <Item title="PPTX 경로 복사">
              PPTX 파일명을 클릭하면 경로가 클립보드에 복사됩니다.
              전체 경로(예:{" "}
              <code className="rounded bg-neutral-100 px-1">
                C:\Users\...\파일명.pptx
              </code>
              )가 복사되게 하려면{" "}
              <Link href="/settings" className="text-indigo-600 underline">
                설정
              </Link>
              에서 폴더의 실제 경로를 한 번 등록해 둬야 합니다(브라우저
              보안 정책상 앱이 자동으로 알아낼 수는 없습니다).
            </Item>
            <Item title="라이브러리에서 제거">
              태그·메모·썸네일 같은 라이브러리 정보만 지웁니다. PDF/PPTX
              원본 파일은 폴더에 그대로 남습니다.
            </Item>
          </Section>

          <Section title="설정">
            <Item title="태그 관리">
              태그 이름 변경·삭제·추가가 가능합니다. &ldquo;미사용 태그
              정리&rdquo; 버튼을 누르면 프리셋이 아니면서 아무 파일에도
              안 쓰이는 태그를 한 번에 정리합니다.
            </Item>
            <Item title="Anthropic API 키">
              AI 태깅을 쓰려면 여기에 본인의 API 키를 등록해야 합니다.
              브라우저에만 저장되고 운영자 서버로는 전송되지 않습니다.
            </Item>
          </Section>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/settings"
              className="rounded bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              설정으로 이동
            </Link>
            <Link
              href="/about"
              className="rounded border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              작동 원리 보기
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
