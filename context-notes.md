# 작업 노트

## 2026-07-05 — 프로젝트 시작

`ppt-reference-library-design.md`, `ppt-reference-library-plan.md`를 기준으로 구현을 시작한다.

**핵심 원칙 (계속 지킬 것):**
- **서버 없음.** Next.js는 화면 전용, 서버 API 라우트를 만들지 않는다.
- **로컬 폴더가 유일한 저장소.** 사용자가 지정한 폴더 안의 `library.json` + `originals/` + `thumbs/`가 데이터베이스 전부다. 중앙 DB, 로그인 없음.
- **Chromium 데스크톱 전용.** File System Access API(`showDirectoryPicker`)는 Chrome/Edge/Opera 데스크톱에서만 동작. Firefox/Safari/모바일은 진입 즉시 안내 화면으로 막는다.
- **AI 태깅만 외부 통신.** 브라우저에서 사용자의 Anthropic API 키로 `api.anthropic.com`에 직접 호출. 그 외 외부 통신 없음. 운영자 서버로 키가 전송되는 경로가 있으면 안 됨.
- 새로 만드는 소스 파일 첫 줄에는 역할을 설명하는 한 줄 한국어 주석을 남긴다(설정 파일은 예외).
- 각 태스크는 Verify를 통과해야 다음으로 넘어간다.

**검증 관련 제약 메모:**
- `showDirectoryPicker()`는 실제 OS 네이티브 폴더 선택 창을 열고 사용자 제스처(클릭)를 요구하는 브라우저 보안 API라, 자동화 도구(Preview 툴 등)로 대신 클릭하거나 폴더를 선택해줄 수 없다. Task 1부터는 이 부분의 최종 확인을 사용자가 실제 Chrome/Edge에서 직접 수행해야 한다. 코드 리뷰·빌드 성공·로직 단위 확인은 내가 진행하고, 실제 폴더 피커 동작 확인은 사용자에게 요청한다.
- Preview 툴(mcp Claude_Preview)로 UI 렌더링, 가드 동작(예: `showDirectoryPicker`를 임시로 지워서 가드 화면 뜨는지), 콘솔/네트워크 확인 등은 자동으로 가능하다.

## 진행 로그
(각 태스크 완료 시 결정 사항, 이슈, verify 결과를 여기 추가)

### Task 0 완료 (2026-07-05)

- `create-next-app`은 폴더 이름(`0705_SlideBox`)에 대문자가 있어 현재 폴더에 직접 스캐폴딩하지 못했다. `slidebox-tmp` 임시 폴더에 생성 후 내용을 루트로 이동하고 `package.json`의 `name`을 `slidebox`로 수정했다.
- 스캐폴딩된 Next.js 버전은 16.2.10(Turbopack 기본, `--no-turbopack` 플래그 무시됨). App Router + TypeScript + Tailwind는 계획대로다. 14+ 요구사항 충족.
- create-next-app이 `.claude/settings.local.json`, `AGENTS.md`, `CLAUDE.md`(→`@AGENTS.md`)를 자동 생성했다. 그대로 유지.
- `.gitignore`에 `.omc/`, `.claude/settings.local.json`(로컬 세션 상태) 추가.
- **버그 발견 및 수정:** `browser-support.ts`를 처음에 `'showDirectoryPicker' in window`로 작성했는데, devtools에서 `window.showDirectoryPicker = undefined`로 덮어써도 `in` 연산자는 소유 프로퍼티 키 존재만 확인하므로 여전히 `true`를 반환했다. 계획서의 Verify 방법(undefined로 덮어써서 가드 확인)이 통과하려면 값 자체를 확인해야 해서 `typeof window.showDirectoryPicker === "function"`으로 변경했다.
- **가드 렌더링 검증 방법:** devtools에서 `window.showDirectoryPicker`를 덮어쓴 뒤 `location.reload()`를 하면, 실제 Chromium 브라우저는 새 문서 로드 시 네이티브 API를 다시 보유하게 되어 오버라이드가 사라진다(JS 전역 상태는 리로드로 초기화되는 것이 정상 동작). 그래서 실제로 "미지원 브라우저"를 재현하려면 `browser-support.ts`의 반환값을 일시적으로 `false`로 하드코딩한 뒤 `location.reload()`로 확인했고(가드 화면 정상 표시 확인), 이후 원래 로직으로 즉시 복원했다. HMR(Fast Refresh)은 컴포넌트 상태를 보존해 `useEffect`가 재실행되지 않으므로, 전체 리로드 없이는 가드를 재트리거할 수 없다는 것도 확인했다.
- 실제 미지원 브라우저(Firefox/Safari) 크로스 브라우저 확인은 Task 6에서 배포 후 진행한다.
- `npm run dev`(기본 페이지 표시)와 `npm run build`(정상 빌드) 모두 확인됨.
