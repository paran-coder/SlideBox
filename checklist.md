# 슬라이드박스 구현 체크리스트

> `ppt-reference-library-plan.md` 기준. 각 태스크는 Verify 통과 후에만 완료 처리합니다.

## Task 0: 프로젝트 스캐폴딩과 브라우저 호환성 가드
- [x] `npx create-next-app@latest . --typescript --tailwind --app` (현재 폴더에 스캐폴딩)
- [x] `checklist.md`, `context-notes.md` 생성
- [x] `src/lib/browser-support.ts` 생성 (`showDirectoryPicker` 지원 감지)
- [x] `src/components/UnsupportedBrowserGate.tsx` 생성 (미지원 브라우저 안내)
- [x] 루트 레이아웃/최상위 클라이언트 컴포넌트에서 가드 적용
- [x] 환경변수 파일 없음 확인
- [x] git 초기화
- [x] Verify: `npm run dev` → localhost:3000 기본 페이지 표시
- [x] Verify: `window.showDirectoryPicker`를 `undefined`로 덮어쓰면 가드 화면 표시
- [x] Commit: `chore: Next.js 프로젝트 초기화, 브라우저 호환성 가드, 작업 문서 생성`

## Task 1: 라이브러리 폴더 연결
- [x] `src/lib/library-dir.ts` (폴더 선택, IndexedDB handle 저장/조회, 권한 재확인)
- [x] `src/lib/library-json.ts` (library.json 읽기·쓰기, 태그 사전 시드 기본값)
- [x] `src/app/setup/page.tsx` (설정 화면 - 폴더 연결 섹션)
- [x] Verify(a): 빈 폴더 선택 → `library.json`(태그 37개), `originals/`, `thumbs/` 생성 (사용자 확인 완료)
- [x] Verify(b): 새로고침해도 폴더 연결 유지(권한 재확인 가능) (사용자 확인 완료)
- [x] Verify: `npm run build` 성공
- [x] Commit: `feat: 라이브러리 폴더 연결, library.json 초기화`

## Task 2: 가져오기 화면 — 단일/일괄, PDF 변환
- [x] `src/app/import/page.tsx`
- [x] `src/lib/pdf-to-images.ts`
- [x] `src/lib/file-key.ts` (NFC 정규화 포함, vitest 9개 통과)
- [ ] **Verify(a): 동일 이름 PDF+PPTX 가져오기 → originals/ 2개 파일, ref 1개 + 슬라이드 페이지 수만큼 — 사용자 확인 보류(2026-07-05, "지금은 건너뛰고 계속 진행")**
- [ ] **Verify(b): 같은 파일 재가져오기 → 덮어쓰기/건너뛰기 확인창 — 사용자 확인 보류**
- [ ] **Verify(c): 일괄 모드 PDF 3개(1개 손상) → 2개 완료, 1개 실패, 진행 안 멈춤 — 사용자 확인 보류**
- [ ] **Verify(d): 50MB 초과 차단 — 사용자 확인 보류**
- [x] Verify: `npm run build` 성공, `tsc --noEmit` 통과
- [x] Commit: `feat: 단일/일괄 가져오기, file_key 매칭, PDF 슬라이드 변환, 폴더 저장`

> ⚠️ Task 2의 (a)~(d)는 사용자 요청으로 지금은 건너뛰고 코드만 커밋한 뒤 다음 태스크로 진행했다. Task 6(최종 검증) 전에 반드시 다시 확인해야 한다.

## Task 3: AI 태깅(BYOK)과 설정 화면
- [x] `src/app/setup/page.tsx` → `src/app/settings/page.tsx` 정리(폴더 연결 + API 키 통합, `/setup` 삭제)
- [x] `src/lib/api-key.ts`
- [x] `src/lib/ai-tagging.ts` (parseAiResponse 단위 테스트 3개 통과)
- [x] Verify(a): 키 저장 후 새로고침 유지, 네트워크 탭에서 운영자 서버로 미전송 확인 (자동 확인 완료 — preview 브라우저로 직접 검증)
- [ ] **Verify(b): 태깅 실행 시 api.anthropic.com 직접 호출만, 사전 내 태그만 저장 — 사용자 확인 보류(2026-07-05, "지금은 건너뛰고 계속 진행")**
- [x] Verify(c): 잘못된 키로 401 안내 표시 (자동 확인 완료 — 실제 api.anthropic.com에 잘못된 키로 fetch, 401 + `AiTaggingUnauthorizedError` 분기 일치 확인)
- [x] Commit: `feat: BYOK 설정 화면과 브라우저 직접 AI 태깅`

> ⚠️ Task 3의 (b)는 실제 Anthropic API 키 + 실제로 가져온 레퍼런스가 있어야 확인 가능해 사용자 요청으로 보류했다. Task 6 전에 반드시 확인. 특히 `ai-tagging.ts`의 모델명 `claude-sonnet-4-6`이 실제로 유효한 모델 ID인지도 이때 같이 확인해야 한다(401이 아닌 모델 관련 에러가 나면 모델명을 조정해야 함).

## Task 4: 라이브러리(홈) 화면 — 그리드, 검색, 필터
- [x] `src/app/page.tsx`
- [x] `src/components/SlideGrid.tsx`, `FileGrid.tsx`, `TagFilter.tsx`, `SearchBar.tsx`
- [x] `src/lib/thumb-url.ts`
- [ ] **Verify(a): 파일/슬라이드 보기 토글 정상 동작 — 사용자 확인 보류(2026-07-05, "지금은 일단 넘어가고 나중에 확인")**
- [ ] **Verify(b): 태그 2개 선택 시 교집합만 표시 — 사용자 확인 보류**
- [ ] **Verify(c): 메모 단어로 검색 가능 — 사용자 확인 보류**
- [ ] **Verify(d): 썸네일 blob URL 정상 표시 — 사용자 확인 보류**
- [x] Verify: `npm run build` 성공, `tsc --noEmit`/vitest 통과
- [x] Commit: `feat: 라이브러리 그리드와 검색·3축 태그 필터`

> ⚠️ Task 4의 (a)~(d)는 실제로 가져온 레퍼런스가 있어야 확인 가능해 사용자 요청으로 보류했다(Task 2 수동 검증도 아직 보류 상태). 자동으로는 폴더 미연결 시 `/settings`로 리다이렉트되는 것과 콘솔 에러 없음만 확인했다. Task 6 전에 반드시 확인.

## Task 5: 레퍼런스 상세 화면 — 태그 편집과 "열기"
- [x] `src/app/refs/[id]/page.tsx`
- [x] `src/components/TagEditor.tsx`
- [x] `src/components/SaveToast.tsx`
- [x] `src/lib/open-pdf.ts`
- [ ] **Verify(a): AI 태그 제거 후 새로고침해도 유지 — 사용자 확인 보류(2026-07-05)**
- [ ] **Verify(b): 새 태그 추가 → 홈 필터에 반영, "저장됨" 표시 — 사용자 확인 보류**
- [ ] **Verify(c): "PDF 열기" → 새 탭에서 PDF 표시 — 사용자 확인 보류**
- [ ] **Verify(d): PPTX 경로 클릭 → 클립보드 복사 + 안내 — 사용자 확인 보류**
- [ ] **Verify(e): 삭제 → 홈에서 사라지고 폴더 내 파일도 제거 — 사용자 확인 보류**
- [ ] **Verify(f): "나중에" 가져온 레퍼런스에서 AI 태깅 버튼 실행 시 태그 생성 — 사용자 확인 보류**
- [x] Verify: `npm run build` 성공, `tsc --noEmit`/vitest 통과
- [x] Commit: `feat: 레퍼런스 상세, 태그 편집(자동 저장), PDF 열기와 PPTX 경로 클릭 복사`

> ⚠️ Task 5의 (a)~(f)는 실제 레퍼런스가 필요해 보류. Task 2, 4, 5의 보류된 수동 검증 항목을 Task 6에서 한꺼번에 확인해야 한다.

## Task 6: 배포와 최종 검증
- [x] 사용자 수동 검증 중 발견된 버그 수정: 폴더 권한 재확인 누락(모든 쓰기 페이지에서 크래시 유발), 네이버 웨일 브라우저 크래시(requestPermission 회피로 해결, 사용자 재테스트 성공) — 자세한 내용은 context-notes.md 참조
- [x] `originals/` 서브폴더 제거(중복 저장 문제 해결, 사용자 피드백) — 설계 문서 갱신 완료
- [x] `npm run lint` 처음 실행, 발견된 8개 문제 전부 정리(0 에러)
- [x] 설정 화면에 태그 관리(이름 변경/삭제, 연쇄 정리) 기능 추가(사용자 요청) — `tsc`/lint/vitest/build 통과, 실제 데이터 검증은 보류
- [ ] Task 2, 4, 5의 보류된 수동 검증 항목 + 태그 관리 기능을 실제 데이터로 재확인(권한/웨일/originals 버그 수정 후 재시도 필요)
- [ ] Vercel에 GitHub 저장소 연결 및 배포 (환경변수 없음)
- [ ] 다른 컴퓨터/브라우저 프로필에서 전체 플로우 재검증
- [ ] 설계 문서 검증 기준 12개 순서대로 확인
- [ ] context-notes.md에 결과와 남은 이슈 기록
- [ ] Commit: `chore: 배포 설정 및 검증 기록`
