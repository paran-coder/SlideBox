# 슬라이드박스 — PPT 레퍼런스 라이브러리 구현 계획

> **For Claude:** 이 계획을 태스크 단위로 순서대로 실행해 주세요. 각 태스크의 검증 단계를 통과하기 전에는 다음 태스크로 넘어가지 않습니다. 시작 전에 `checklist.md`와 `context-notes.md`를 생성하고, 작업 중 내린 결정은 context-notes에 계속 기록합니다. 새로 만드는 소스 파일 첫 줄에는 그 파일의 역할을 한 줄 한국어 주석으로 남깁니다(설정 파일은 예외).

**Goal.** PDF/PPTX 레퍼런스를 가져오면 슬라이드 낱장 그리드로 보여주고, AI 태그 초안 + 3축 필터로 빠르게 다시 찾을 수 있는 웹앱입니다. 사용자가 지정한 로컬 폴더가 유일한 저장소이며, 서버·데이터베이스·클라우드 계정이 없습니다. 사용자가 준비하는 것은 라이브러리 폴더 선택과 Anthropic API 키뿐입니다.

**Architecture.** Next.js(App Router) 프론트엔드 전용 프로젝트입니다. **서버 API 라우트가 없습니다.** File System Access API(`showDirectoryPicker`)로 사용자가 지정한 폴더에 원본 파일·썸네일·`library.json`(메타데이터 전체)을 직접 읽고 씁니다. AI 태깅은 사용자의 Anthropic API 키로 브라우저에서 직접 호출합니다. PDF→이미지 변환은 브라우저에서 pdf.js로 처리합니다.

**중요한 제약.** File System Access API는 Chrome 86+, Edge 86+, Opera 72+ 등 Chromium 계열 **데스크톱 브라우저에서만** 동작합니다. Firefox·Safari·모바일은 지원하지 않습니다. Task 0에서 이를 감지해 안내하는 가드를 반드시 먼저 만듭니다.

**Tech Stack.** Next.js 14+(App Router, TypeScript), File System Access API, pdf.js(pdfjs-dist), Anthropic API 브라우저 직접 호출, Tailwind CSS, Vercel 배포(환경변수 없음).

**설계 문서.** `ppt-reference-library-design.md` 참조. 이 계획과 충돌 시 설계 문서가 우선합니다.

---

## 사전 준비 (사용자가 직접)

1. Vercel 계정 생성(배포 단계에서 사용합니다).
2. Anthropic Console에서 API 키 발급 — 완성된 앱의 설정 화면에 입력할 키입니다(BYOK). 월 지출 한도를 걸어두는 것을 권장합니다.
3. 라이브러리로 쓸 빈 폴더 하나를 컴퓨터에 미리 만들어 둡니다(선택 사항, 앱 안에서 새 폴더를 만들어도 됩니다).

---

## Task 0: 프로젝트 스캐폴딩과 브라우저 호환성 가드

**Files:**
- Create: 프로젝트 루트 (create-next-app)
- Create: `checklist.md`, `context-notes.md`
- Create: `src/lib/browser-support.ts` (File System Access API 지원 여부 감지)
- Create: `src/components/UnsupportedBrowserGate.tsx` (미지원 브라우저 안내 화면)

**Steps:**
1. `npx create-next-app@latest slidebox --typescript --tailwind --app` 실행합니다.
2. `checklist.md`에 이 계획의 태스크를 체크박스로 옮겨 적습니다. `context-notes.md`에 날짜와 "프로젝트 시작", 그리고 "서버 없음 / 로컬 폴더가 유일한 저장소 / Chromium 데스크톱 전용" 원칙을 기록합니다.
3. `browser-support.ts`는 `'showDirectoryPicker' in window` 여부를 반환하는 간단한 함수입니다.
4. 루트 레이아웃 또는 최상위 클라이언트 컴포넌트에서 이 함수로 지원 여부를 확인하고, 미지원이면 `UnsupportedBrowserGate`를 렌더링해 "이 앱은 Chrome 또는 Edge 데스크톱에서만 사용할 수 있습니다"를 안내하며 나머지 화면을 막습니다.
5. 환경변수 파일은 필요 없습니다. 서버가 다루는 비밀값이 없기 때문입니다.
6. git 초기화.

**Verify:** `npm run dev` 실행 → localhost:3000에서 기본 페이지가 표시됩니다. 개발자 도구에서 `window.showDirectoryPicker`를 임시로 `undefined`로 덮어써서 가드 화면이 뜨는지 확인합니다.
**Commit:** `chore: Next.js 프로젝트 초기화, 브라우저 호환성 가드, 작업 문서 생성`

---

## Task 1: 라이브러리 폴더 연결 — 폴더 선택, 권한 영속화, library.json 초기화

**Files:**
- Create: `src/lib/library-dir.ts` (폴더 선택, IndexedDB에 handle 저장/조회, 권한 재확인)
- Create: `src/lib/library-json.ts` (library.json 읽기·쓰기, 태그 사전 시드 포함 기본값 생성)
- Create: `src/app/setup/page.tsx` (설정 화면의 폴더 연결 섹션 — Task 3에서 API 키 섹션이 추가됩니다)

**library-dir.ts 동작 명세:**
1. `pickLibraryDirectory()`: `window.showDirectoryPicker({ mode: 'readwrite' })`로 폴더를 선택받고, 반환된 handle을 `idb-keyval` 라이브러리로 IndexedDB에 저장합니다(handle 자체는 작은 객체라 IndexedDB 저장이 표준적으로 지원됩니다).
2. `getLibraryDirectory()`: IndexedDB에서 handle을 조회합니다. 없으면 `null`을 반환합니다.
3. `ensurePermission(handle)`: `handle.queryPermission({ mode: 'readwrite' })`로 현재 권한 상태를 확인하고, `'granted'`가 아니면 `handle.requestPermission({ mode: 'readwrite' })`를 호출합니다(사용자 클릭 등 제스처가 있는 흐름에서 호출해야 합니다).
4. 하위 폴더 `originals/`, `thumbs/`가 없으면 처음 연결 시 생성합니다(`getDirectoryHandle(name, { create: true })`).

**library-json.ts 동작 명세:**
1. `readLibrary(dirHandle)`: `library.json` 파일을 읽어 파싱합니다. 파일이 없으면 아래 기본값으로 새로 만듭니다.
2. 기본값: `{ version: 1, tags: [...태그 사전 시드 37개(스타일 15, 레이아웃 12, 주제 10)...], refs: [] }`.
3. `writeLibrary(dirHandle, data)`: 전체 객체를 JSON으로 직렬화해 `library.json`에 통째로 덮어씁니다(`getFileHandle('library.json', {create:true})` → `createWritable()` → `write()` → `close()`).

**setup 페이지 동작 명세:**
1. "라이브러리 폴더 선택" 버튼 → `pickLibraryDirectory()` 호출 → 성공하면 `library.json` 초기화(`readLibrary`가 없으면 생성) → 홈으로 이동.
2. 이미 연결된 폴더가 있으면 폴더 이름을 표시하고 "다시 연결" 버튼을 둡니다.

**Verify:** (a) 빈 폴더를 선택하면 그 폴더 안에 `library.json`(태그 37개 포함), `originals/`, `thumbs/`가 생성됩니다. (b) 브라우저를 새로고침해도 재선택 없이 같은 폴더가 연결된 상태로 유지됩니다(권한 재확인 버튼이 필요할 수 있습니다). `npm run build` 성공.
**Commit:** `feat: 라이브러리 폴더 연결, library.json 초기화`

---

## Task 2: 가져오기 화면 — 단일/일괄 가져오기와 PDF 변환

**Files:**
- Create: `src/app/import/page.tsx` (가져오기 화면, 단일/일괄 모드 탭 — 기존 "업로드"를 "가져오기"로 명명합니다)
- Create: `src/lib/pdf-to-images.ts` (pdf.js 변환 유틸)
- Create: `src/lib/file-key.ts` (파일명에서 file_key 추출: 확장자 제거, 공백 trim, **`.normalize('NFC')` 유니코드 정규화 필수** — macOS는 한글 파일명을 NFD로 저장해서 정규화 없이는 Windows에서 만든 같은 이름의 파일과 매칭이 안 됩니다)

**동작 명세 (공통):**
1. 파일명에서 확장자를 뺀 값이 `file_key`입니다. PDF와 PPTX의 file_key가 같으면 한 쌍으로 자동 인식합니다.
2. 파일당 50MB 초과 시 가져오기 전에 경고하고 차단합니다.
3. 저장 순서: (a) 선택한 PDF/PPTX 파일을 `originals/{file_key}.pdf`(`.pptx`)로 라이브러리 폴더에 복사합니다(`getFileHandle(name,{create:true})` → `createWritable()` → 원본 File의 바이트를 write) → (b) pdf.js로 PDF 각 페이지를 canvas에 렌더 → JPEG(폭 800px 기준)로 변환 → `thumbs/{file_key}/pN.jpg`로 저장 → (c) `library.json`을 읽어 새 ref·slide 항목을 추가하고 다시 씁니다.
4. **중복 감지.** 같은 file_key가 이미 `library.json`에 있으면 "덮어쓰기 / 건너뛰기" 확인. 덮어쓰기는 기존 `thumbs/{file_key}/`를 비우고 재생성하며 library.json의 해당 ref를 교체합니다.
5. **PPTX 단독 가져오기.** file_key가 일치하는 기존 ref가 있으면 `has_pptx`만 true로 갱신하고 `originals/{file_key}.pptx`를 저장합니다. 없으면 "먼저 PDF를 가져와 주세요" 안내.
6. 변환 실패(손상 PDF 등) 시 해당 파일만 실패 처리합니다. 이미 복사된 파일은 정리해 부분 성공 상태를 남기지 않습니다.
7. 라이브러리 폴더가 연결되지 않은 상태로 이 화면에 오면 `/setup`으로 리다이렉트합니다.

**동작 명세 (단일 모드 — 기본):** 파일 선택 영역 + 제목 입력(기본값: file_key) + 메모 입력. 변환 진행률을 "3 / 24 페이지"로 표시합니다.

**동작 명세 (일괄 모드):** 여러 파일을 한 번에 선택하면 file_key로 PDF-PPTX를 자동으로 짝지어 목록으로 보여줍니다. "AI 태깅 지금 실행 / 나중에" 체크박스(기본값: 지금 실행)를 둡니다. localStorage에 Anthropic API 키가 없으면 이 옵션을 비활성화하고 "설정에서 API 키를 등록하세요" 안내를 표시합니다(설정 화면은 Task 3에서 구현합니다). 파일별 상태(대기 / 변환 중 / AI 태깅 중 / 완료 / 실패)를 목록으로 표시하고, 순차 처리하되 하나가 실패해도 계속 진행합니다.

**기술 주의사항:** `pdfjs-dist`는 클라이언트 전용으로 동적 import합니다. worker 설정이 필요합니다. 폴더 쓰기 작업은 전부 Task 1의 `library-dir.ts`/`library-json.ts` 함수를 통해서만 수행합니다.

**Verify:** (a) 단일 모드에서 같은 이름의 PDF+PPTX를 가져오면 라이브러리 폴더의 `originals/`에 두 파일이 모두 생기고, `library.json`에 ref 1개와 슬라이드가 페이지 수만큼 생성됩니다. (b) 같은 파일 재가져오기 → 덮어쓰기/건너뛰기 확인창이 표시됩니다. (c) 일괄 모드에서 PDF 3개(그중 1개는 손상 파일)를 가져오면 2개 완료, 1개 실패로 표시되고 진행이 멈추지 않습니다. (d) 50MB 초과가 차단됩니다. `npm run build` 성공.
**Commit:** `feat: 단일/일괄 가져오기, file_key 매칭, PDF 슬라이드 변환, 폴더 저장`

---

## Task 3: AI 태깅(BYOK)과 설정 화면

**Files:**
- Modify: `src/app/setup/page.tsx` → `src/app/settings/page.tsx`로 정리(폴더 연결 섹션 + API 키 섹션을 한 화면에 통합합니다. `/setup`은 최초 온보딩 전용으로 남기거나 `/settings`로 통합해도 됩니다 — 구현 시 더 단순한 쪽으로 정리)
- Create: `src/lib/api-key.ts` (localStorage에 Anthropic 키 저장/조회/삭제하는 유틸)
- Create: `src/lib/ai-tagging.ts` (브라우저에서 Anthropic API를 직접 호출, library.json에 결과 반영)

**설정 화면 동작 명세:**
1. Anthropic API 키 입력란(마스킹 표시), 저장/삭제 버튼을 둡니다. 저장 위치는 localStorage뿐이며 "어떤 서버로도 전송되지 않는다"는 문구를 명시합니다.
2. 키 발급 가이드(Anthropic Console 링크 + 단계 안내)와 "월 지출 한도 설정 권장" 안내를 포함합니다. "이 키는 비밀번호와 동일하게 취급하세요" 경고도 포함합니다.
3. 현재 연결된 라이브러리 폴더 이름을 표시하고 "폴더 다시 연결" 버튼을 둡니다.

**ai-tagging.ts 동작 명세:**
1. 입력: ref의 file_key. `thumbs/{file_key}/`의 각 이미지를 라이브러리 폴더 handle로 읽어 base64로 변환한 뒤 Anthropic API(`https://api.anthropic.com/v1/messages`)를 fetch로 직접 호출합니다. 헤더에 `x-api-key`(localStorage의 키)와 `anthropic-dangerous-direct-browser-access: true`를 포함합니다.
2. 슬라이드를 배치(한 요청당 최대 10장)로 나눠 브라우저에서 순차 호출합니다. 모델: `claude-sonnet-4-6`.
3. 프롬프트 핵심 규칙 — `library.json`의 태그 사전을 그대로 나열하고, **사전에 있는 태그만** 고르게 합니다. 응답은 JSON only로 받습니다.

프롬프트 골격:

```
당신은 PPT 슬라이드 이미지를 분류하는 도구다.
각 슬라이드에 대해 아래 사전에 있는 태그만 골라라. 사전에 없는 단어는 절대 만들지 마라.
스타일 사전: [...15개]
레이아웃 사전: [...12개]
주제 사전: [...10개]
슬라이드당 스타일 1~2개, 레이아웃 1개, 주제 0~1개.
마지막으로 파일 전체에 대한 태그(스타일 1~2, 주제 1)도 골라라.
응답은 JSON만: {"slides":[{"page_no":1,"style":[],"layout":[],"topic":[]}],"file":{"style":[],"topic":[]}}
```

4. 응답을 파싱해 해당 ref와 슬라이드들의 `tag_ids`에 반영하고 `writeLibrary`로 저장합니다. 파싱 시 마크다운 코드펜스를 제거한 후 JSON.parse를 시도하고, 실패 시 해당 배치만 건너뛰고 콘솔에 로그를 남깁니다.
5. 오류 처리: 401 응답 → "API 키가 유효하지 않습니다. 설정에서 확인해 주세요"를 표시하고 설정 화면 링크를 제공합니다. 그 외 실패 → 태그 없이 두고 상세 화면의 "다시 시도" 버튼으로 재시도합니다.
6. 가져오기 화면에서 "AI 태깅 지금 실행"이 선택된 경우에만 저장 완료 후 이 함수를 호출합니다(Task 2 코드에 연결합니다).

**Verify:** (a) 설정 화면에서 키를 저장하면 새로고침 후에도 유지되고, 네트워크 탭에서 키가 운영자 서버로 전송되지 않음을 확인합니다. (b) Task 2에서 가져온 레퍼런스로 태깅을 실행하면 네트워크 탭에 api.anthropic.com 직접 호출만 보이고, library.json에 사전 내 태그만 저장됩니다. 사전에 없는 태그가 하나라도 저장되면 실패로 간주하고 프롬프트를 수정합니다. (c) 일부러 틀린 키를 저장하고 실행하면 401 안내가 표시됩니다.
**Commit:** `feat: BYOK 설정 화면과 브라우저 직접 AI 태깅`

---

## Task 4: 라이브러리(홈) 화면 — 그리드, 검색, 필터

**Files:**
- Create: `src/app/page.tsx` (라이브러리 홈)
- Create: `src/components/SlideGrid.tsx`, `src/components/FileGrid.tsx`, `src/components/TagFilter.tsx`, `src/components/SearchBar.tsx`
- Create: `src/lib/thumb-url.ts` (라이브러리 폴더의 이미지 파일을 읽어 blob URL로 변환하는 유틸 — `<img src="로컬경로">`는 동작하지 않으므로 필요합니다)

**동작 명세:**
1. 상단에 검색창 + "파일 보기 / 슬라이드 보기" 전환 토글 + 가져오기 버튼 + 설정 링크를 둡니다. 그 아래 태그 필터가 스타일/레이아웃/주제 3열로 표시됩니다.
2. 라이브러리 폴더가 연결되지 않은 상태로 접근하면 `/settings`(또는 `/setup`)로 리다이렉트합니다.
3. 마운트 시 `readLibrary`로 전체 메타데이터를 불러오고, 화면에 보이는 썸네일들은 `thumb-url.ts`로 `thumbs/`의 이미지를 읽어 blob URL을 만들어 표시합니다.
4. 슬라이드 보기: 썸네일 masonry/그리드로 표시하고, 클릭 시 소속 레퍼런스 상세로 이동합니다.
5. 파일 보기: 파일당 대표 썸네일(1페이지) + 제목 + 파일 태그 카드로 표시합니다. `has_pptx` 여부를 아이콘으로 표시합니다.
6. 검색: 키워드가 제목, 메모, 태그 이름 중 하나라도 매치되면 표시합니다.
7. 필터: 복수 선택 시 교집합(AND)으로 좁혀집니다. 슬라이드 보기는 슬라이드의 `tag_ids` 기준, 파일 보기는 ref의 `tag_ids` 기준입니다.
   **구현 방식:** `library.json` 전체를 메모리에 올려 클라이언트에서 검색·필터링합니다. 복잡한 쿼리 로직은 만들지 않습니다(YAGNI).
8. 데이터가 없을 때는 빈 상태 안내와 가져오기 유도 문구를 표시합니다.

**Verify:** 레퍼런스 2~3개를 가져온 뒤 — (a) 토글 전환이 정상 동작합니다. (b) 태그 2개를 선택하면 둘 다 가진 항목만 남습니다(교집합). (c) 메모에만 있는 단어로 검색해도 검색됩니다. (d) 썸네일 이미지가 실제로 보입니다(blob URL 정상 동작 확인). `npm run build` 성공.
**Commit:** `feat: 라이브러리 그리드와 검색·3축 태그 필터`

---

## Task 5: 레퍼런스 상세 화면 — 태그 편집과 "열기"

**Files:**
- Create: `src/app/refs/[id]/page.tsx`
- Create: `src/components/TagEditor.tsx`
- Create: `src/components/SaveToast.tsx` (짧게 표시되고 사라지는 "저장됨" 안내 컴포넌트. 클립보드 복사 안내에도 재사용합니다)
- Create: `src/lib/open-pdf.ts` (originals/의 PDF 파일을 읽어 새 탭에서 여는 유틸. PPTX는 다운로드 사본이 의미 없다고 판단해 버튼을 두지 않고, 경로를 클릭하면 클립보드로 복사되는 방식으로 처리합니다)

**동작 명세:**
1. 상단에 제목(인라인 수정), 메모(인라인 수정), "PDF 열기" 버튼, PPTX가 있으면(`has_pptx`) 버튼 대신 폴더 내 상대 경로 텍스트(예: `originals/강남프로젝트_제안서.pptx`)를 표시합니다. 이 텍스트를 클릭하면 `navigator.clipboard.writeText()`로 경로를 복사하고 `SaveToast`로 "경로가 복사되었습니다"를 잠깐 보여줍니다. 레퍼런스 삭제 버튼(확인 다이얼로그)도 둡니다.
2. **자동 저장.** 제목·메모 입력란은 별도 저장 버튼 없이 `blur`(포커스가 벗어날 때) 시점에 `library.json`에 즉시 반영합니다. 태그 추가·제거는 클릭 즉시 반영합니다. 두 경우 모두 저장이 끝나면 `SaveToast`로 "저장됨"을 1~2초 정도 보여주고 사라지게 합니다. 모든 읽기·쓰기는 `library-json.ts`의 read/write로 처리합니다.
3. `open-pdf.ts`: `originals/{file_key}.pdf`를 handle로 읽어 `URL.createObjectURL(file)`로 blob URL을 만들고 새 탭으로 엽니다.
3. 파일 태그 영역: 현재 태그를 칩으로 표시합니다. AI 초안은 점선 테두리 등으로 시각 구분합니다(태그 항목에 `source` 필드를 두어 구분: `'ai' | 'manual'`). 클릭 한 번으로 제거할 수 있습니다. "+ 태그" 클릭 시 사전 태그 목록에서 선택하거나 새 태그를 생성할 수 있습니다(kind 선택 필수, 사용자 생성은 `is_preset=false`).
4. 슬라이드 목록: 세로로 크게 나열합니다. 각 슬라이드 아래에 슬라이드 태그 칩과 동일한 편집 UI를 둡니다.
5. "AI 태깅 실행/다시 시도" 버튼: 태그가 없는 경우 상단에 노출됩니다. `ai-tagging.ts`를 호출합니다. API 키가 없으면 설정 화면으로 안내합니다.
6. 삭제 시 `originals/`, `thumbs/{file_key}/`를 모두 삭제하고 `library.json`에서 해당 ref를 제거합니다.

**Verify:** (a) AI 태그 하나를 제거하고 새로고침하면 유지됩니다. (b) 새 태그를 추가하면 홈 필터에 그 태그가 나타나고, 그때마다 "저장됨" 안내가 잠깐 표시됩니다. (c) "PDF 열기"를 누르면 새 탭에서 PDF가 보입니다. (d) PPTX가 있는 레퍼런스에서 경로 텍스트를 클릭하면 클립보드에 경로가 복사되고("붙여넣기"로 확인) "복사되었습니다" 안내가 표시됩니다. (e) 삭제하면 홈에서 사라지고 폴더 내 파일도 제거됩니다. (f) "나중에"로 가져온 레퍼런스에서 AI 태깅 버튼을 실행하면 태그가 생성됩니다.
**Commit:** `feat: 레퍼런스 상세, 태그 편집(자동 저장), PDF 열기와 PPTX 경로 클릭 복사`

---

## Task 6: 배포와 최종 검증

**Steps:**
1. Vercel에 GitHub 저장소를 연결하고 배포합니다. **환경변수는 없습니다.**
2. 다른 컴퓨터(또는 다른 브라우저 프로필)에서 배포된 URL에 접속해 폴더 연결부터 전체 플로우를 처음부터 다시 밟아봅니다.
3. 설계 문서의 검증 기준 11개를 순서대로 확인합니다.
   - Chrome/Edge에서 폴더 선택 한 번으로 연결이 완료됩니다.
   - PDF 가져오기 → 30초 내 슬라이드 그리드에 표시됩니다.
   - AI 태그가 사전 내 태그로만 달리고 클릭으로 수정됩니다.
   - 3축 복수 선택 필터가 교집합으로 작동합니다.
   - "PDF 열기" 버튼으로 PDF 원본이 새 탭에서 열립니다. PPTX 경로를 클릭하면 클립보드로 복사되고 안내가 표시됩니다.
   - 제목·메모·태그 수정 시 별도 버튼 없이 즉시 저장되고 "저장됨" 안내가 표시됩니다.
   - 같은 file_key의 PDF·PPTX가 자동으로 페어링됩니다.
   - 일괄 가져오기 10개에서 개별 진행 상태가 표시되고 부분 실패가 허용됩니다.
   - **네트워크 탭에서 통신 대상이 api.anthropic.com뿐임을 확인합니다.**
   - 브라우저 재시작 후에도(권한 재확인 클릭 한 번 후) 기존 라이브러리가 그대로 보입니다.
   - Firefox나 Safari로 접속하면 즉시 안내 문구가 표시됩니다.
   - 실제 레퍼런스 수십 개를 투입한 뒤 사용감을 확인합니다.
4. 결과와 남은 이슈를 context-notes.md에 기록합니다.

**Commit:** `chore: 배포 설정 및 검증 기록`

---

## 만들지 않는 것 (YAGNI)

- 서버 API 라우트, 중앙 데이터베이스, 로그인/회원가입, 메타데이터 내보내기/가져오기 — 로컬 폴더가 유일한 저장소이므로 필요 없습니다.
- Safari·모바일 지원(File System Access API 대안이 필요해 별도 재설계 대상입니다).
- PPTX→PDF 변환 탭(외부 API가 필요합니다 — 한글 폰트 깨짐·비용 리스크로 MVP 제외, 확장 후보입니다).
- 여러 라이브러리 폴더 병합 도구, 유사 슬라이드 검색(임베딩), 즐겨찾기, 정렬 옵션, 다크모드. 전부 검증 이후 판단합니다.

## 테스트에 관한 메모

이 프로젝트는 UI 중심 개인용 MVP라 자동 테스트 대신 각 태스크의 Verify(수동 검증 + `npm run build`)를 완료 기준으로 삼습니다. 예외적으로 로직이 응집된 세 곳 — file-key 유틸(NFC 정규화 포함), pdf-to-images 유틸, AI 응답 파서 — 은 단순 단위 테스트를 붙일 가치가 있으니 구현 세션에서 vitest로 추가하는 것을 권장합니다. File System Access API 자체는 브라우저 환경 의존적이라 단위 테스트 대상에서 제외하고 수동 검증으로 충분히 다룹니다.
