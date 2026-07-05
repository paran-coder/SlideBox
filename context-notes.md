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

### Task 1 완료 (2026-07-05)

- `idb-keyval`(handle 저장), `@types/wicg-file-system-access`(File System Access API 타입) 의존성 추가.
- 타입 이름 주의: DOM lib에 이미 `FileSystemPermissionDescriptor`(Permissions API용, `{name, handle}` 요구)가 있어 이름이 겹친다. File System Access API의 권한 서술자는 `FileSystemHandlePermissionDescriptor`를 써야 한다.
- **데이터 모델 결정:** 설계 문서 예시는 `tag_ids: string[]`만 보여주지만, 계획서 Task 5는 "AI 초안은 점선 테두리로 구분(태그 항목에 source: 'ai'|'manual')"을 요구한다. 나중에 스키마를 갈아엎지 않도록, ref/slide 각각에 `tag_ids`(전체 부여 태그, 검색·필터는 그대로 이 배열로 단순하게 동작)와 별도로 `ai_tag_ids`(그 중 AI가 달았고 아직 사용자가 손대지 않은 것)를 나란히 두기로 했다. Task 5에서 이 필드로 점선 테두리 구분을 구현할 것.
- 태그 사전 37개(스타일 15/레이아웃 12/주제 10)는 설계 문서에 구체적 이름이 없어 PPT 레퍼런스 라이브러리 맥락에 맞게 직접 정했다(`library-json.ts`의 `STYLE_PRESETS`/`LAYOUT_PRESETS`/`TOPIC_PRESETS` 참조). id는 `{kind}-{slug}` 형식.
- `showDirectoryPicker()`는 실제 사용자 클릭(trusted gesture)이 있어야 여는 네이티브 OS 다이얼로그라 자동화 도구로 대신 클릭할 수 없다(억지로 열면 다이얼로그가 무응답으로 걸릴 위험). 코드 리뷰 + `tsc --noEmit` + `npm run build`는 내가 직접 확인했고, 실제 폴더 선택/생성 파일 확인/새로고침 후 연결 유지는 사용자가 직접 Chrome에서 확인해 "정상 동작함"으로 확인받았다.

### Task 2 완료 (2026-07-05) — 단, 수동 Verify는 보류

- `pdfjs-dist`(v6.1.200) 설치. v6 API 주의사항: `page.render()`는 `canvas`를 직접 넘기는 방식을 쓴다(`canvasContext`는 레거시). `getDocument(...)`가 반환하는 `PDFDocumentLoadingTask`에 `destroy()`가 있고, `.promise`로 얻는 `PDFDocumentProxy` 자체에는 `destroy()`가 없다 — 정리(cleanup)는 loadingTask 쪽에서 해야 한다.
- `vitest` 추가(devDependency), `npm run test` 스크립트 추가. `file-key.ts`(NFC 정규화 포함)에 대해 단위 테스트 9개 작성, 전부 통과 확인 — 계획서가 권장한 3곳(file-key, pdf-to-images, AI 응답 파서) 중 하나를 먼저 커버했다. pdf-to-images는 실제 canvas/PDF 렌더링이 필요해 브라우저 환경 의존적이므로 이번엔 단위 테스트를 붙이지 않고 수동 검증으로 남겨둔다.
- **API 키 저장소 키 임시 결정:** `import/page.tsx`에 `API_KEY_STORAGE_KEY = "slidebox:anthropic-api-key"`를 임시로 하드코딩했다. Task 3에서 `src/lib/api-key.ts`를 만들 때 반드시 이 문자열 그대로 재사용(또는 그쪽 상수를 import해서 교체)해야 기존에 저장된 키와 어긋나지 않는다.
- **AI 태깅 연결 지점:** `handleBatchStart` 안에 "Task 3에서 aiTagNow && hasApiKey면 여기서 ai-tagging.ts를 호출" 주석으로 표시해뒀다. Task 3에서 이 지점에 실제 호출을 연결한다.
- **부분 실패 롤백:** `importFilePair`는 PDF/PPTX를 복사한 뒤 변환이 실패하면 방금 복사한 파일과 thumbs 폴더를 정리하고 에러를 던진다. 단, "덮어쓰기" 중 실패하면 이미 교체된 이전 원본은 되돌리지 못한다(기존 파일을 이미 덮어썼으므로) — 이는 사용자가 덮어쓰기를 선택한 데 따른 허용 가능한 리스크로 판단했다.
- **중복 확인 UI:** `window.confirm()`으로 덮어쓰기/건너뛰기를 확인한다(별도 커스텀 모달 없음, MVP 범위).
- **⚠️ 수동 검증 보류:** Task 2의 Verify (a)~(d)는 실제 PDF/PPTX 파일을 네이티브 파일 선택창으로 골라야 확인 가능한데, 사용자가 "지금은 건너뛰고 계속 진행"을 요청해 코드 구현과 자동 테스트(vitest, tsc, build)만 확인한 상태로 커밋하고 다음 태스크로 넘어갔다. **Task 6 최종 검증 전에 반드시 이 4가지를 실제로 확인해야 한다.**

### Task 3 완료 (2026-07-05) — 단, (b)는 보류

- `/setup`을 삭제하고 `/settings`로 통합했다(폴더 연결 + API 키 섹션). `import/page.tsx`의 리다이렉트도 `/setup` → `/settings`로 변경.
- `src/lib/api-key.ts`가 정식으로 `"slidebox:anthropic-api-key"` 키를 관리한다. `import/page.tsx`는 이제 이 모듈의 `getApiKey()`를 쓰도록 리팩터링했고, Task 2에서 남겨둔 임시 상수/주석은 제거했다.
- `ai-tagging.ts`: 슬라이드 10장 배치로 나눠 순차 호출, 매 배치마다 파일 전체 태그도 요청해서 합집합으로 모은다(사양의 프롬프트 골격을 그대로 따르되, "마지막 배치에서만 파일 태그 요청" 대신 매 배치 요청 후 합치는 방식을 택함 — 더 단순하고 결과는 동일).
- `parseAiResponse`를 export해 vitest 3개 작성(순수 JSON, 코드펜스 포함, 잘못된 JSON) — 전부 통과. 계획서가 권장한 3곳(file-key, pdf-to-images, AI 응답 파서) 중 2곳 커버 완료.
- **모델명 주의:** 계획서에 명시된 `claude-sonnet-4-6`을 그대로 사용했다. 이 세션 기준 실제 유효한 모델 ID인지는 확인하지 못했다 — 실제 키로 태깅을 처음 돌릴 때 모델 관련 에러(model not found 등)가 나면 이 상수를 조정해야 한다.
- **자동 검증한 것:** (1) 키 저장 후 새로고침해도 유지됨(localStorage 직접 확인), (2) 이 세션 동안 발생한 네트워크 요청은 전부 localhost:3000(개발 서버 자체 리소스)뿐, 운영자 서버로 키가 전송되는 코드 경로 자체가 없음(코드 리뷰로도 확인), (3) 잘못된 키로 실제 `https://api.anthropic.com/v1/messages`에 직접 fetch한 결과 401 + `authentication_error`가 반환되어, `ai-tagging.ts`의 401 분기(`AiTaggingUnauthorizedError`)와 정확히 일치함을 확인.
- **⚠️ 보류:** 실제 Anthropic 키로 Task 2에서 가져온 레퍼런스에 대해 전체 AI 태깅을 실행해, 사전에 없는 태그가 저장되지 않는지 확인하는 것은 실제 키와 실제 폴더가 필요해 사용자가 "지금은 건너뛰고 계속 진행"을 요청했다. **Task 6 전에 반드시 확인.**

### Task 4 완료 (2026-07-05) — 단, 수동 Verify는 보류

- `src/lib/thumb-url.ts`에 순수 함수(`readThumbAsBlobUrl`)와 React 훅(`useThumbUrl`)을 함께 뒀다. 훅은 언마운트 시 `URL.revokeObjectURL`로 정리한다.
- `FileGrid`/`SlideGrid`는 각 카드가 자체적으로 `useThumbUrl`을 호출해 자기 썸네일만 읽어온다(중앙 캐시 없이 컴포넌트별 단순 구현 — YAGNI).
- 검색·필터는 `page.tsx`의 `useMemo` 안에서 클라이언트 메모리 필터링으로 구현했다(설계 문서/계획서 명세대로, 복잡한 쿼리 로직 없음).
- 슬라이드 보기는 CSS `columns-*`(masonry) 방식으로 Pinterest식 그리드를 구현했다.
- 홈 화면은 폴더 미연결 시 `/settings`로 리다이렉트한다 — 이 부분은 실제로 preview 브라우저(라이브러리 미연결 상태)로 자동 확인했다.
- **⚠️ 보류:** 실제 그리드 렌더링(토글, 태그 교집합 필터, 검색, 썸네일 표시)은 가져온 레퍼런스가 있어야 확인 가능한데, Task 2 수동 검증도 아직 보류 상태라 사용자가 "지금은 일단 넘어가고 나중에 확인"을 요청했다. **Task 6 전에 Task 2, 4의 보류된 수동 검증을 한 번에 몰아서 확인해야 한다.**
