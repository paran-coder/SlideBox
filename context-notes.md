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

### Task 5 완료 (2026-07-05) — 단, 수동 Verify는 보류

- `SaveToast`는 `{ text, id }` 형태의 `ToastTrigger`를 트리거로 받는다. 같은 문자열이 연속으로 와도(예: "저장됨" 연타) `id`가 매번 달라 useEffect가 재실행되고 토스트가 다시 표시된다(문자열만 비교했다면 두 번째 트리거가 무시됐을 것).
- `TagEditor`는 파일/슬라이드에 공용으로 재사용한다. AI 초안 여부는 `ai_tag_ids`에 포함되어 있는지로 판단해 점선 테두리로 표시하고, 제거 시 `tag_ids`와 `ai_tag_ids` 양쪽에서 함께 제거한다. 새 태그 생성은 `crypto.randomUUID()`로 id를 만들고 `is_preset: false`로 저장한다.
- 상세 페이지의 모든 쓰기 작업(제목/메모 blur 저장, 태그 추가/제거/생성, 삭제)은 `mutateLibrary` 헬퍼 하나로 통일해 `writeLibrary` 호출과 "저장됨" 토스트 표시를 항상 함께 처리한다.
- "AI 태깅 실행" 버튼은 `ref.tag_ids`와 모든 슬라이드의 `tag_ids`가 전부 비어 있을 때만 노출한다(스펙: "태그가 없는 경우 상단에 노출").
- 삭제는 `originals/{file_key}.pdf`(+`.pptx`), `thumbs/{file_key}/`를 지우고 `library.json`에서 ref를 제거한 뒤 홈으로 이동한다.
- **⚠️ 보류:** Task 5의 Verify (a)~(f) 전부 실제 레퍼런스가 필요해 사용자가 "지금은 건너뛰고 계속 진행"을 요청했다. 자동으로는 폴더 미연결 시 `/refs/[id]`가 `/settings`로 리다이렉트되는 것과 콘솔 에러 없음만 확인했다. **Task 6 진입 전, Task 2·4·5에서 보류된 모든 수동 검증 항목을 실제 데이터로 한 번에 몰아서 확인해야 한다.**

### Task 6 진행 중 발견한 버그 2건 (2026-07-05)

사용자가 실제 데이터로 수동 검증을 시작하면서 발견됨. 둘 다 수정하고 커밋함.

**1. 권한 재확인 누락 버그 (심각).** `import`, 홈(`page.tsx`), `refs/[id]` 세 페이지 모두 `getLibraryDirectory()`로 IndexedDB에서 폴더 handle만 가져오고, `readwrite` 권한이 실제로 살아있는지(`queryPermission`) 확인하지 않은 채 바로 파일을 썼다. 오직 `/settings`의 "폴더 접근 다시 허용" 버튼만 권한을 재확인했다. 세션에 따라 `readwrite` 권한이 리셋되면 `getFileHandle`/`createWritable` 호출이 `"Failed to execute 'getFileHandle'... not allowed by the user agent"` 에러로 실패했다.
   - **수정:** `library-dir.ts`에 `useLibraryDirectory()` 훅을 추가했다. 이 훅은 handle을 불러온 뒤 `queryPermission({mode:'readwrite'})`으로 확인하고, 권한이 없으면 `needsPermission=true`를 반환한다. 세 페이지 모두 이 훅으로 교체했고, `needsPermission`이 true면 쓰기 작업을 막고 "폴더 접근 다시 허용" 버튼(클릭 시 `requestPermission()` → 내부적으로 `ensurePermission()`)을 보여주는 화면을 렌더링한다.

**2. 네이버 웨일(Whale) 브라우저 크래시 (심각, 지원 브라우저 범위 문제).** 사용자가 웨일 브라우저에서 "폴더 접근 다시 허용" 버튼을 눌렀더니 **브라우저 프로그램 전체가 종료**되었다. 웨일은 Chromium 기반이라 `showDirectoryPicker` API 자체는 존재해서 Task 0의 브라우저 가드를 통과하지만, `handle.requestPermission()` 호출 시 웨일 자체의 구현 버그로 브라우저가 크래시되는 것으로 추정된다(연결된 폴더는 일반 로컬 폴더였고 OneDrive 등 클라우드 동기화 폴더가 아니었으므로 폴더 위치는 원인이 아님).
   - 설계 문서가 "이 앱은 PC의 Chrome 또는 Edge에서만 쓸 수 있습니다"라고 명시하고 있어서, feature-detection만으로는 부족하고 **알려진 비호환 브라우저를 UA로 명시적으로 차단**하는 것이 정당하다고 판단했다.
   - **수정:** `browser-support.ts`에 `isKnownIncompatibleBrowser()`를 추가해 UA에 `Whale/`이 포함되면 `isBrowserSupported()`가 false를 반환하게 했다(`hasDirectoryPickerApi()`는 순수 기능감지로 별도 분리). `UnsupportedBrowserGate.tsx`는 웨일처럼 알려진 비호환 브라우저일 때 일반 "미지원 브라우저" 문구 대신 "폴더 접근 권한 요청 시 브라우저가 종료되는 문제가 확인되어 지원하지 않습니다" 문구를 보여준다. `browser-support.test.ts`에 회귀 테스트 2개 추가(웨일 UA→true, 일반 Chrome UA→false).
   - **후속 조치 필요:** 이후 다른 Chromium 파생 브라우저(Brave, Vivaldi 등)에서도 유사한 문제가 보고되면 같은 방식으로 UA 패턴을 추가해야 한다. 지금은 실제로 크래시가 확인된 웨일만 차단한다.
- **가져오기 화면 UX 개선(사용자 피드백):** 기본 `<input type="file">`이 브라우저 기본 스타일(작은 회색 링크처럼 보임)이라 버튼처럼 보이지 않는다는 피드백을 받았다. Tailwind의 `file:` 변형 클래스로 검정/회색 버튼 스타일을 입혔고, 파일을 선택하면 옆에 "지우기" 버튼이 나타나 다시 고를 수 있게 했다(파일 input은 uncontrolled라 `key`를 바꿔 remount하는 방식으로 초기화한다 — `pdfInputKey`/`pptxInputKey`로 각 필드를 독립적으로 리셋).

### 웨일 크래시 원인 추정 및 재조정 (2026-07-05)

사용자가 "웨일도 지원하게 할 수 없냐"고 요청해 원인을 더 조사했다.

- Chrome 공식 블로그(Persistent Permissions for the File System Access API, 2024)에 따르면 **Chrome 122부터 IndexedDB에 저장해둔 `FileSystemHandle`에 `requestPermission()`을 호출하면 "이번 세션만 허용 / 방문할 때마다 허용 / 허용 안 함" 3방향 프롬프트가 새로 뜬다.** 정확히 내가 만들었던 "폴더 접근 다시 허용" 버튼이 이 호출을 트리거했다. 웨일 자체 포럼에도 권한 요청 팝업이 안 닫히거나 깜빡이는 등 일반적인 불안정성 제보가 있어(https://forum.whale.naver.com/topic/61590/ 등), 이 새 3방향 프롬프트 UI를 웨일이 제대로 이식하지 못해 크래시하는 것이라는 가설이 유력하다.
- **조치:** `library-dir.ts`의 `useLibraryDirectory` 훅에서 `requestPermission`을 완전히 제거하고, 권한이 없을 때는 항상 `pickLibraryDirectory()`(=`showDirectoryPicker` 재호출)로 재연결하는 `reconnect()`로 바꿨다. 이러면 앱 어디에서도 저장된 handle에 `requestPermission()`을 호출하는 코드가 없어, 문제의 3방향 프롬프트 자체가 뜰 일이 없다. `settings/page.tsx`의 "폴더 접근 다시 허용" 버튼도 제거하고 기존 "다시 연결"(`pickLibraryDirectory`) 버튼 하나로 통합했다.
- **브라우저 가드 재조정:** `isBrowserSupported()`에서 웨일 하드 차단을 다시 제거해 순수 기능감지로 되돌렸다(`hasDirectoryPickerApi()`와 동일). `isKnownIncompatibleBrowser()`는 남겨뒀지만 이제 차단이 아니라 `UnsupportedBrowserGate`에서 웨일 감지 시 화면 상단에 비차단 경고 배너("과거 폴더 접근 관련 문제가 있었습니다")만 보여주는 용도로 쓴다.
- **중요 — 이 수정은 검증되지 않았다.** 이건 정황 증거에 기반한 가설 수정이지, 실제로 웨일에서 재현·확인된 것은 아니다. 사용자가 위험을 인지한 상태로("다른 작업 중인 탭/창은 미리 저장") 직접 웨일에서 재테스트하기로 했다. **다음 세션에서 이어간다면, 웨일 재테스트 결과부터 확인할 것.** 만약 여전히 크래시가 나면 웨일은 다시 하드 차단해야 하고(이전 커밋에서 되돌리는 방법 확인 가능), `requestPermission()` 회피만으로는 부족하다는 뜻이므로 원인을 더 좁혀야 한다.
- **결과: 웨일 재테스트 성공.** 사용자가 직접 확인, 크래시 없이 폴더 재연결 정상 동작함.

### 아키텍처 변경: `originals/` 서브폴더 제거 (2026-07-05)

웨일 재테스트 직후, 사용자가 실제 사용 중 중요한 문제를 지적했다: "라이브러리 폴더로 이미 PDF/PPTX가 모여있는 폴더를 지정했는데, 가져오기를 하면 그 파일들을 `originals/`로 또 복사한다 — 원본은 원본대로 남고 폴더 안에 같은 내용의 파일이 하나 더 생겨서 디스크 낭비 아니냐"는 지적이었다. 정확한 지적이었다.

- **원인.** 계획서/설계 문서 원안은 `originals/{file_key}.pdf`로 통일된 위치에 항상 복사하는 구조였다. 하지만 사용자가 애초에 레퍼런스를 모아둔 폴더를 그대로 "라이브러리 폴더"로 지정하는 흔한 시나리오에서는, 이미 그 자리에 있는 파일을 다시 골라 같은 폴더의 하위 폴더로 복사하는 게 되어 순수하게 중복 저장만 발생시킨다.
- **변경.** `originals/` 서브폴더를 없애고 PDF/PPTX 원본은 **라이브러리 폴더 최상위**에 `{file_key}.pdf`/`.pptx`로 직접 저장하도록 바꿨다. `thumbs/`는 앱이 새로 만들어내는 파생 이미지라 그대로 서브폴더로 유지한다.
  - `library-dir.ts`: `pickLibraryDirectory()`가 더 이상 `originals/`를 생성하지 않는다.
  - `import/page.tsx`의 `importFilePair`: `dirHandle` 최상위에 직접 쓴다.
  - `refs/[id]/page.tsx`의 `deleteRefFiles`, `open-pdf.ts`의 `openPdfInNewTab`: 모두 `dirHandle` 최상위 기준으로 변경.
  - PPTX 경로 클릭-복사 텍스트도 `originals/{file_key}.pptx` → `{file_key}.pptx`(파일명만)로 변경.
- **⚠️ 놓치기 쉬운 안전 이슈 — 반드시 기억할 것.** 원본이 이제 라이브러리 폴더 "최상위"에 있다는 것은, **가져오기 도중 실패했을 때 무작정 롤백(삭제)하면 사용자가 이미 갖고 있던 원본 파일을 지워버릴 수 있다**는 뜻이다(예전 `originals/` 구조에서는 항상 앱이 만든 사본이었으므로 안전했지만, 지금은 그 경로에 사용자의 진짜 원본이 있을 수 있다). 그래서 `importFilePair`에서 쓰기 전에 `fileExists()`로 파일이 이미 있었는지 먼저 확인해두고(`pdfPreexisted`/`pptxPreexisted`), 실패 시 롤백에서는 **이번에 새로 만든 파일만** 지우고 이미 있던 파일은 절대 건드리지 않는다. 앞으로 이 근처 코드를 수정할 일이 있으면 이 안전장치를 반드시 유지해야 한다.
- **디자인/설계 문서 갱신.** `ppt-reference-library-design.md`의 폴더 구조 다이어그램과 PPTX 경로 설명을 새 구조로 수정했다(설계 문서는 "현재 진실"을 반영해야 하는 문서라 갱신함). `ppt-reference-library-plan.md`(태스크별 실행 계획)는 이미 실행이 끝난 과거 기록이라 원문 그대로 두고, 이 노트에 차이를 남기는 쪽을 택했다 — Task 1/2/5의 plan 텍스트 중 `originals/` 언급은 이제 실제 구현과 다르다는 점을 유의할 것.

### 뒤늦게 발견: `npm run lint`를 한 번도 안 돌렸었다 (2026-07-05)

Task 0~5 내내 `tsc --noEmit`/`vitest`/`npm run build`만 확인하고 `npm run lint`는 확인하지 않았다. Task 6에서 처음 돌려보니 8개 문제(6 에러, 2 경고)가 나왔다. 전부 정리했다:
- `import/page.tsx`, `page.tsx`: 안 쓰는 변수(`i`, `SlideEntry`) 제거.
- `refs/[id]/page.tsx`: `showToast`에서 `Date.now()`를 쓴 게 `react-hooks/purity`(불순 함수 호출) 규칙에 걸렸다. `Date.now()` 대신 `useRef` 기반 증가 카운터로 바꿔서 근본적으로 해결했다.
- `import/page.tsx`, `settings/page.tsx`, `SaveToast.tsx`, `UnsupportedBrowserGate.tsx`, `thumb-url.ts`: `react-hooks/set-state-in-effect` 규칙(Next 16 + 최신 eslint-plugin-react-hooks에 새로 포함된, React Compiler 대비 규칙)이 여러 곳에서 걸렸다. 전부 검토했는데, 다들 실제로 문제가 되는 패턴이 아니라 이 규칙이 대안 없이 걸고넘어지는 정당한 용례였다(SSR에서는 알 수 없는 값(localStorage/브라우저 지원 여부)을 마운트 후 한 번만 클라이언트에서 갱신 — 하이드레이션 불일치를 피하려고 일부러 이렇게 짠 것, 비동기 파일 읽기 완료 후 상태 갱신, 타이머 기반 자동 숨김). `useSyncExternalStore`로 다시 짜는 게 "정석"이겠지만 이 규모의 MVP에 과한 리팩터라고 판단해, 각 위치에 이유를 적은 `eslint-disable-next-line` 주석으로 명시적으로 억제했다. `npm run lint` 결과 0 에러 0 경고로 정리됨.
- **교훈:** 앞으로 각 태스크 Verify에 `npm run lint`도 습관적으로 포함할 것.

### 기능 추가: 설정 화면 태그 관리 (2026-07-05)

사용자가 프리셋 태그 37개가 고정인지 물어봐서, 이름 변경/삭제 기능을 설정 화면에 추가하는 걸 제안했고 동의를 받아 구현했다.

- `settings/page.tsx`에 "태그 관리" 섹션 추가. 스타일/레이아웃/주제 3열로 모든 태그(프리셋+커스텀 구분 없이)를 보여주고, 각 태그는 인라인 입력(blur 시 저장)으로 이름을 바꿀 수 있고 "×" 버튼으로 삭제할 수 있다.
- **이름 변경:** `tag_id`는 그대로 두고 `name`만 바꾸므로 참조 무결성 문제가 없다.
- **삭제:** `library.tags`에서 제거하는 것과 동시에, 그 태그가 붙어 있던 모든 ref의 `tag_ids`/`ai_tag_ids`와 모든 slide의 `tag_ids`/`ai_tag_ids`에서도 함께 제거하는 연쇄 정리를 한다(안 하면 존재하지 않는 tag_id가 library.json에 고아로 남아 `tagsById.get(id)`가 undefined를 반환하고 상세/홈 화면에서 조용히 무시되긴 하지만 데이터가 지저분해진다). 삭제 전 `window.confirm`으로 한 번 확인한다.
- `TagRow` 컴포넌트는 `useState(tag.name)`을 초기값으로만 쓰고 prop 변경을 동기화하는 `useEffect`를 넣지 않았다 — `key={tag.id}`로 충분하고(같은 사용자가 이 행에서 직접 수정한 경우만 prop이 바뀌므로 로컬 상태와 이미 일치), 불필요한 `set-state-in-effect` lint 이슈도 피할 수 있다.
- 설정 화면은 폴더 핸들을 별도 상태(`dirHandle`)로 유지하고, 권한이 확인되면(`!needsPermission`) `readLibrary`로 `library` 상태를 채우는 두 번째 `useEffect`를 추가했다. 폴더가 연결 안 됐거나 `library`가 아직 없으면 태그 관리 섹션 자체를 숨긴다.
- **⚠️ 수동 검증 필요:** 실제 폴더에서 태그 이름 변경 → 홈/상세 화면에 새 이름이 반영되는지, 태그 삭제 → 그 태그가 붙어있던 레퍼런스/슬라이드에서 사라지는지는 사용자가 실제 데이터로 확인해야 한다.

### 기능 추가: 홈 화면 기본 보기·페이지네이션 (2026-07-05)

사용자 요청: (1) 홈 화면 기본 보기 모드를 "슬라이드 보기" → "파일 보기"로, (2) 파일 보기/슬라이드 보기 각각 페이지당 개수(10/30/50/100)를 선택할 수 있고, 그 선택이 다음 접속 때도 유지되게.

- `src/components/PaginationBar.tsx` 새로 추가: 이전/다음 버튼, 현재 페이지/전체 페이지, 페이지당 개수 셀렉트, 전체 개수 표시.
- `page.tsx`: `viewMode` 기본값을 `"file"`로 변경. `filePageSize`/`slidePageSize`를 각각 `localStorage`(`slidebox:file-page-size`, `slidebox:slide-page-size`)에 저장하고 마운트 시 복원한다. `filteredRefs`/`filteredSlideItems`를 페이지 단위로 slice해서 그리드에 넘긴다.
- 검색어·태그 필터가 바뀌면 현재 페이지를 1로 되돌려야 하는데, 이걸 `useEffect`로 하면 `react-hooks/set-state-in-effect`에 걸린다. **effect 대신 렌더링 도중 이전 필터값과 비교해서 조정하는 패턴**(React 공식 문서가 권장하는 "prop이 바뀌면 상태 조정" 패턴)으로 다시 짜서 lint 이슈 자체를 없앴다 — `prevFilterKey` state와 비교 후 다르면 그 자리에서 `setFilePage(1)`/`setSlidePage(1)`을 호출한다. 이 방식이 이번 세션에서 처음 써본 패턴이라 기록해둔다: effect+setState보다 리렌더 한 번이 적고, 새 lint 규칙과도 충돌하지 않는다. 앞으로 "prop 바뀌면 상태 리셋"류 코드는 이 패턴을 먼저 고려할 것.
- 페이지 크기 기본값은 30으로 정했다(사용자가 정확한 기본값을 지정하지 않아서 10/30/50/100 중 중간값으로 임의 선택 — 마음에 안 들면 `DEFAULT_PAGE_SIZE` 상수만 바꾸면 됨).
- **⚠️ 수동 검증 필요:** 실제 데이터로 페이지 전환, 페이지당 개수 변경 후 새로고침/재접속해도 그 설정이 유지되는지, 파일보기/슬라이드보기 설정이 서로 독립적으로 유지되는지 확인 필요.

### 보완: 설정 화면 태그 관리에 "추가" 빠짐 (2026-07-05)

사용자가 삭제는 되는데 추가는 어떻게 하냐고 물어서 확인해보니, 태그 관리 섹션에 이름변경/삭제만 만들고 추가를 빼먹었었다(태그 생성은 그동안 상세 화면의 TagEditor에서만 가능했음 — 특정 레퍼런스에 부착하면서 생성하는 흐름). `AddTagInput` 컴포넌트를 추가해 각 카테고리(스타일/레이아웃/주제) 목록 끝에 점선 테두리의 "+ 새 태그" 입력을 뒀다. Enter나 + 버튼으로 `handleCreateTag(kind, name)` 호출 → `crypto.randomUUID()`로 id 생성, `is_preset: false`로 `library.tags`에 추가한다(특정 ref에 자동으로 붙지는 않음 — 순수하게 사전에만 추가됨).
