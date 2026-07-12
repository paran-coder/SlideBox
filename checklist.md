# 슬라이드박스 구현 체크리스트

> `ppt-reference-library-plan.md` 기준. 각 태스크는 Verify 통과 후에만 완료 처리합니다.
> 2026-07-11: context-notes.md 전체 이력과 대조해서 실제로 사용자가 확인한 항목만 [x]로 갱신. `originals/` 서브폴더는 이후 아키텍처 변경으로 제거되어 관련 문구도 함께 수정함.

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
- [x] `src/app/settings/page.tsx` (설정 화면 - 폴더 연결 섹션, 이후 `/setup`에서 통합됨)
- [x] Verify(a): 빈 폴더 선택 → `library.json`(태그 37개), `thumbs/` 생성 — 사용자 확인 완료 (당시엔 `originals/`도 함께 생성했으나 이후 아키텍처 변경으로 제거됨)
- [x] Verify(b): 새로고침해도 폴더 연결 유지(권한 재확인 가능) — 사용자 확인 완료
- [x] Verify: `npm run build` 성공
- [x] Commit: `feat: 라이브러리 폴더 연결, library.json 초기화`

## Task 2: 가져오기 화면 — 단일/일괄, PDF 변환
- [x] `src/app/import/page.tsx`
- [x] `src/lib/pdf-to-images.ts`
- [x] `src/lib/file-key.ts` (NFC 정규화 포함, vitest 9개 통과)
- [x] Verify(a): 동일 file_key PDF+PPTX 가져오기 → ref 1개로 자동 결합 + 슬라이드 페이지 수만큼 생성 — 실제 라이브러리 폴더 안의 PDF+PPTX 쌍 4개로 일괄 가져오기 재테스트, 4개 전부 정상 확인(2026-07-05, "이상없는것 같아")
- [ ] **Verify(b): 같은 file_key 재가져오기 → 덮어쓰기/건너뛰기 확인창 — 명시적으로 재현 테스트한 기록 없음, 미확인**
- [ ] **Verify(c): 일괄 모드에서 손상된 PDF 포함 시 나머지는 진행되고 손상 파일만 실패 표시 — 미확인(50MB 초과 차단 케이스만 테스트됨, "손상된 파일" 케이스는 아직 안 해봄)**
- [x] Verify(d): 50MB 초과 차단 — 실제 오버사이즈 파일로 확인, 정상 차단됨(2026-07-05)
- [x] Verify: `npm run build` 성공, `tsc --noEmit` 통과
- [x] Commit: `feat: 단일/일괄 가져오기, file_key 매칭, PDF 슬라이드 변환, 폴더 저장`

> ⚠️ (b)(c)는 아직 미확인. 특히 (b)는 지금 라이브러리 폴더 안에 이미 있는 파일을 재가져오기하는 흔한 시나리오라 우선순위가 높다.

## Task 3: AI 태깅(BYOK)과 설정 화면
- [x] `src/app/setup/page.tsx` → `src/app/settings/page.tsx` 정리(폴더 연결 + API 키 통합, `/setup` 삭제)
- [x] `src/lib/api-key.ts`
- [x] `src/lib/ai-tagging.ts` (parseAiResponse 단위 테스트 3개 통과)
- [x] Verify(a): 키 저장 후 새로고침 유지, 네트워크 탭에서 운영자 서버로 미전송 확인 — 자동 확인 완료
- [x] Verify(b): 태깅 실행 시 사전 내 태그만 저장 — 실제 키로 여러 차례 AI 태깅 실행 후 "사전 위반" 제보를 태그 관리 목록과 대조, 스타일 15/레이아웃 12/주제 10 정확히 37개로 이상 없음 확인(2026-07-05). 다만 **DevTools 네트워크 탭에서 통신 대상이 api.anthropic.com 하나뿐인지 직접 눈으로 확인한 기록은 없음**(코드 리뷰상 다른 호출 경로 없음은 확인됨) — 설계 문서 검증 기준 9번과 겹치므로 거기서 마저 확인
- [x] Verify(c): 잘못된 키로 401 안내 표시 — 자동 확인 완료
- [x] Commit: `feat: BYOK 설정 화면과 브라우저 직접 AI 태깅`

> 모델명 `claude-sonnet-4-6`은 실제 태깅 호출에서 모델 관련 에러 없이 응답이 왔으므로 유효한 것으로 간주.

## Task 4: 라이브러리(홈) 화면 — 그리드, 검색, 필터
- [x] `src/app/page.tsx`
- [x] `src/components/SlideGrid.tsx`, `FileGrid.tsx`, `TagFilter.tsx`, `SearchBar.tsx`
- [x] `src/lib/thumb-url.ts`
- [x] Verify(a): 파일/슬라이드 보기 토글 정상 동작 — 세션 내내 반복적으로 실사용 확인됨
- [ ] **Verify(b): 태그 2개 이상 선택 시 교집합만 표시 — 명시적으로 다중 선택 테스트한 기록 없음, 미확인**
- [ ] **Verify(c): 메모 단어로 검색 가능 — 명시적으로 테스트한 기록 없음, 미확인**
- [x] Verify(d): 썸네일 blob URL 정상 표시 — 실제 파일(그린메트릭스 등) 카드 썸네일이 정상 렌더링되는 것을 스크린샷으로 여러 차례 확인
- [x] Verify: `npm run build` 성공, `tsc --noEmit`/vitest 통과
- [x] Commit: `feat: 라이브러리 그리드와 검색·3축 태그 필터`

## Task 5: 레퍼런스 상세 화면 — 태그 편집과 "열기"
- [x] `src/app/refs/[id]/page.tsx`
- [x] `src/components/TagEditor.tsx`
- [x] `src/components/SaveToast.tsx`
- [x] `src/lib/open-pdf.ts`
- [ ] **Verify(a): AI 태그 제거 후 새로고침해도 유지 — 명시적으로 "제거 후 새로고침" 순서로 테스트한 기록 없음, 미확인(쓰기 자체는 항상 즉시 `writeLibrary`로 저장되므로 위험도는 낮음)**
- [x] Verify(b): 새 태그 추가 → 홈 필터에 반영, "저장됨" 표시 — `text123` 태그로 여러 차례 실제 확인(2026-07-05)
- [ ] **Verify(c): "PDF 열기" → 새 탭에서 PDF 표시 — `originals/` 제거 이후(원본이 폴더 최상위로 이동) 재확인한 기록 없음, 미확인**
- [ ] **Verify(d): PPTX 경로 클릭 → 클립보드 복사 + 안내 — 파일명만 복사되던 문제는 발견·수정(수동 경로 등록 방식)했으나, 수정 후 전체 경로가 실제로 정확히 복사되는지 재확인한 기록 없음, 미확인**
- [ ] **Verify(e): "라이브러리에서 제거" → 홈에서 사라지고 `thumbs/`만 삭제, PDF/PPTX 원본은 폴더에 그대로 남음 — 항목 자체가 원래 "원본도 삭제"로 잘못 적혀 있었음(아키텍처 변경으로 반대가 정답). 로직은 구현·리뷰 완료, 실제 파일로 제거 후 원본 생존을 직접 확인한 기록은 없음, 미확인**
- [ ] **Verify(f): 태그 없는 레퍼런스에서 "AI 태깅 실행" 버튼 클릭 시 태그 생성 — 배치 가져오기 중 자동 AI 태깅은 확인됐으나, 상세 화면의 수동 "AI 태깅 실행" 버튼 단독 실행은 명시적으로 테스트한 기록 없음, 미확인**
- [x] Verify: `npm run build` 성공, `tsc --noEmit`/vitest 통과
- [x] Commit: `feat: 레퍼런스 상세, 태그 편집(자동 저장), PDF 열기와 PPTX 경로 클릭 복사`

## Task 6: 배포와 최종 검증
- [x] 사용자 수동 검증 중 발견된 버그 수정: 폴더 권한 재확인 누락(모든 쓰기 페이지에서 크래시 유발) — 자세한 내용은 context-notes.md 참조
- [x] `originals/` 서브폴더 제거(중복 저장 문제 해결, 사용자 피드백) — 설계 문서 갱신 완료
- [x] `npm run lint` 처음 실행, 발견된 8개 문제 전부 정리(0 에러) — 이후에도 매 변경마다 습관적으로 확인 중
- [x] 설정 화면에 태그 관리(이름 변경/삭제/추가, 연쇄 정리, 미사용 태그 일괄 정리) 기능 추가
- [x] 홈 화면 기본 보기(파일 보기)와 파일/슬라이드 보기별 페이지네이션(10/30/50/100, localStorage 유지) 추가
- [x] **네이버 웨일 브라우저 크래시 — 최종 결론: "웨일 자체의 버그", 앱 코드로 해결 불가.** 프로덕션 배포본에서도 재현되어 `showDirectoryPicker()` 네이티브 구현 문제로 확정. 하드 차단은 하지 않고 비차단 경고 배너 유지. 자세한 경위는 context-notes.md 참조.
- [x] Vercel에 GitHub 저장소 연결 및 배포 완료 — https://slidebox.vercel.app
- [x] UI 폴리시 다수 라운드(메타데이터/파비콘, 로딩 스켈레톤, 버튼 색 위계, 카드 그림자, 랜딩·소개·개인정보 페이지 신설, 상단바 통일, 페이지 폭 통일, 상세 화면 슬라이드 그리드화) — 자세한 내용은 context-notes.md 참조
- [x] 매번 접속 시 폴더 재선택해야 하는 불편 개선: `requestPermission()` 기반 가벼운 권한 재요청 버튼 추가(크롬 기준)
- [x] context-notes.md에 결과와 남은 이슈 계속 기록 중(진행형 문서)
- [ ] **다른 컴퓨터/브라우저 프로필에서 전체 플로우 재검증 — 미확인**
- [ ] **설계 문서 검증 기준 12개 순서대로 확인 — 아래 표로 세분화, 진행 중**
- [ ] Commit: `chore: 배포 설정 및 검증 기록` — 지금까지는 각 수정마다 개별 커밋으로 대체됨. 별도 커밋이 꼭 필요한지는 12개 검증 기준을 다 확인한 뒤 판단.

### 설계 문서 검증 기준 12개 (design.md 기준)

| # | 기준 | 상태 | 비고 |
|---|---|---|---|
| 1 | Chrome/Edge에서 폴더 선택 한 번으로 라이브러리 연결 완료 | ✅ 확인됨 | Task 1에서 사용자 확인 |
| 2 | PDF 가져오면 30초 내 슬라이드 그리드에 나타남 | ⚠️ 미확인 | 기능은 되지만 시간을 재본 적 없음 |
| 3 | AI 태그 초안이 사전 안의 태그로만, 클릭으로 수정 | ✅ 확인됨 | 37개 프리셋 정확히 일치, 클릭 수정도 TagEditor로 확인됨 |
| 4 | 태그 3축 복수 선택 필터가 교집합으로 정확히 작동 | ⚠️ 미확인 | 로직 리뷰는 됐으나 실사용 테스트 없음 |
| 5 | "PDF 열기"로 새 탭에 열림, PPTX 경로 클릭 복사+안내 | ⚠️ 미확인 | 둘 다 `originals/` 제거 이후 재확인 필요 |
| 6 | 제목·메모·태그 즉시 저장 + "저장됨" 안내 | ✅ 확인됨 | text123 태그 라운드에서 반복 확인 |
| 7 | 같은 file_key PDF+PPTX 자동으로 한 레퍼런스로 묶임 | ✅ 확인됨 | 일괄 가져오기 4/4 성공 |
| 8 | 일괄 가져오기 여러 개, 개별 진행 상태 표시, 실패가 전체 안 막음 | ⚠️ 부분 확인 | 4개 중 1개 50MB 차단 + 나머지 진행됨은 확인. "손상된 파일" 케이스는 미확인 |
| 9 | 네트워크 탭에서 통신 대상이 api.anthropic.com뿐 | ⚠️ 미확인 | 코드 리뷰로는 확인, DevTools로 직접 본 적은 없음 |
| 10 | 브라우저 재시작 후 재접속(권한 재확인 클릭 한 번)해도 라이브러리 그대로 | ⚠️ 진행 중 | `requestPermission()` 버튼까지는 구현·배포됨, 클릭 후 라이브러리가 실제로 정상 표시되는지 마지막 확인 필요 |
| 11 | Firefox/Safari 접속 시 안내 문구 표시, 오작동 없음 | ⚠️ 미확인 | 가드 로직은 하드코딩으로 시뮬레이션 확인함, 실제 Firefox/Safari로는 안 해봄 |
| 12 | 실제 레퍼런스 수십 개 넣고 "찾는 시간이 줄었다"고 느낌 | ⚠️ 미확인 | 지금까지 테스트한 레퍼런스는 4~5개 수준, "수십 개" 규모 실사용은 아직 |
