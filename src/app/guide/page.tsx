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
      <div className="text-sm text-neutral-600">{children}</div>
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
            <Item title="데이터 내보내기 / 가져오기">
              <p>
                다른 컴퓨터나 브라우저로 옮길 때 AI 태깅을 처음부터 다시
                돌리지 않아도 되게 해주는 기능입니다. &ldquo;내보내기&rdquo;는
                태그 정보만 담은 파일을 내려받습니다(원본 PDF/PPTX나
                썸네일은 포함하지 않습니다 — 브라우저는 폴더의 실제 경로를
                알 수 없어서, 파일이 아니라{" "}
                <strong>파일명(file_key)</strong>으로 매칭합니다).
              </p>
              <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-900">
                <p className="font-semibold">내보내기 전에 확인하세요</p>
                <ul className="mt-2 flex flex-col gap-2 list-disc pl-4">
                  <li>
                    매칭 기준은 <strong>파일명</strong>입니다(폴더 위치는
                    상관없습니다). 새 컴퓨터에서 PDF/PPTX 파일 이름을
                    바꾸면 그 파일은 매칭되지 않고 건너뛰어집니다 — 파일명을
                    그대로 유지한 채 옮기세요.
                  </li>
                  <li>
                    내보내기는 <strong>그 순간의 스냅샷</strong>입니다.
                    내보낸 뒤에 태그를 더 추가하거나 AI 태깅을 더 돌렸다면,
                    옮기기 직전에 다시 한번 내보내야 최신 상태가 반영됩니다.
                  </li>
                  <li>
                    이미 직접 고쳐둔 제목은 가져오기해도 되돌아가지
                    않습니다(실수로 덮어쓰지 않도록 태그만 병합됩니다).
                  </li>
                  <li>
                    내보내기 파일(JSON) 자체는 원본 PDF/PPTX와 같은 폴더에
                    둘 필요가 없습니다 — USB, 클라우드, 이메일 등 어디로
                    옮기셔도 됩니다.
                  </li>
                </ul>
              </div>
              <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-100 p-4 text-amber-900">
                <p className="font-semibold">가져오기 순서가 중요합니다</p>
                <ol className="mt-2 flex flex-col gap-3">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                      1
                    </span>
                    <span>
                      <strong>먼저 원본 파일 가져오기.</strong> 새
                      환경에서 같은 PDF/PPTX들을 &ldquo;가져오기&rdquo;로
                      라이브러리에 등록합니다.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                      2
                    </span>
                    <span>
                      <strong>그다음 태그 파일 가져오기.</strong> 내보내둔
                      태그 JSON 파일을 &ldquo;가져오기&rdquo;하면 파일명이
                      같은 항목에 태그가 자동으로 복원됩니다.
                    </span>
                  </li>
                </ol>
                <p className="mt-3 text-xs font-medium text-amber-800">
                  순서를 바꿔서 1번 없이 태그 파일부터 가져오면 매칭할
                  파일이 없어 전부 건너뛰어집니다.
                </p>
              </div>
            </Item>
            <Item title="라이브러리 초기화">
              모든 레퍼런스와 태그를 지우고 태그 사전을 프리셋 상태로
              되돌립니다. PDF/PPTX 원본 파일은 지워지지 않지만, 라이브러리
              데이터는 되돌릴 수 없으니 필요하면 먼저 위의
              &ldquo;내보내기&rdquo;로 태그를 백업해 두세요.
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
