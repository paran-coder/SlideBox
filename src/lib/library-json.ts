// library.json 읽기·쓰기와 태그 사전 시드를 포함한 기본값 생성을 담당한다.

export type TagKind = "style" | "layout" | "topic";

export interface TagDef {
  id: string;
  name: string;
  kind: TagKind;
  is_preset: boolean;
}

export interface SlideEntry {
  page_no: number;
  thumb: string;
  tag_ids: string[];
  // tag_ids 중 AI가 초안으로 달았고 아직 사용자가 손대지 않은 태그(상세 화면에서 점선 테두리로 구분)
  ai_tag_ids: string[];
}

export interface RefEntry {
  id: string;
  file_key: string;
  title: string;
  memo: string;
  has_pptx: boolean;
  created_at: string;
  tag_ids: string[];
  ai_tag_ids: string[];
  slides: SlideEntry[];
}

export interface LibraryData {
  version: 1;
  tags: TagDef[];
  refs: RefEntry[];
}

const LIBRARY_FILE_NAME = "library.json";

const STYLE_PRESETS: string[] = [
  "미니멀",
  "컬러풀",
  "모노톤",
  "그라데이션",
  "일러스트",
  "사진중심",
  "다크모드",
  "파스텔",
  "기업형",
  "럭셔리",
  "빈티지레트로",
  "기하학적",
  "3D",
  "라인아트",
  "손글씨",
];

const LAYOUT_PRESETS: string[] = [
  "표지",
  "목차",
  "섹션구분",
  "비교",
  "타임라인",
  "프로세스단계",
  "조직도",
  "표",
  "차트그래프",
  "인용구",
  "이미지풀블리드",
  "마무리",
];

const TOPIC_PRESETS: string[] = [
  "사업계획서",
  "마케팅",
  "재무",
  "제품소개",
  "브랜딩",
  "IR투자",
  "교육강의",
  "이벤트",
  "리포트보고",
  "포트폴리오",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPresetTags(kind: TagKind, names: string[]): TagDef[] {
  return names.map((name) => ({
    id: `${kind}-${slugify(name)}`,
    name,
    kind,
    is_preset: true,
  }));
}

export function createPresetTags(): TagDef[] {
  return [
    ...buildPresetTags("style", STYLE_PRESETS),
    ...buildPresetTags("layout", LAYOUT_PRESETS),
    ...buildPresetTags("topic", TOPIC_PRESETS),
  ];
}

export function createDefaultLibrary(): LibraryData {
  return {
    version: 1,
    tags: createPresetTags(),
    refs: [],
  };
}

// 사용자가 직접 만든(is_preset=false) 태그가 파일/슬라이드 어디에서도 더 이상
// 쓰이지 않게 되면 사전에서도 함께 제거한다. 그렇지 않으면 한 번 만들고 뗀
// 커스텀 태그가 홈 필터 목록에 영구히 남는다. 프리셋 태그는 아무 데도 안
// 쓰여도 항상 선택 가능해야 하므로 대상에서 제외한다.
export function pruneUnusedCustomTag(
  library: LibraryData,
  tagId: string,
): LibraryData {
  const tag = library.tags.find((t) => t.id === tagId);
  if (!tag || tag.is_preset) return library;
  const stillUsed = library.refs.some(
    (r) =>
      r.tag_ids.includes(tagId) ||
      r.slides.some((s) => s.tag_ids.includes(tagId)),
  );
  if (stillUsed) return library;
  return { ...library, tags: library.tags.filter((t) => t.id !== tagId) };
}

// pruneUnusedCustomTag는 "지금 막 뗀 태그 하나"만 정리한다. 이 함수는 이미
// 고아가 된 기존 커스텀 태그들(그 기능이 생기기 전에 만들어졌다 떨어진 태그 등)을
// 한 번에 훑어 정리할 때 쓴다(설정 화면의 "정리" 버튼용).
export function pruneAllUnusedCustomTags(library: LibraryData): LibraryData {
  const usedTagIds = new Set<string>();
  for (const ref of library.refs) {
    for (const id of ref.tag_ids) usedTagIds.add(id);
    for (const slide of ref.slides) {
      for (const id of slide.tag_ids) usedTagIds.add(id);
    }
  }
  const tags = library.tags.filter(
    (t) => t.is_preset || usedTagIds.has(t.id),
  );
  if (tags.length === library.tags.length) return library;
  return { ...library, tags };
}

// 라이브러리 전체 초기화 — thumbs/ 폴더를 비우고 library.json을 프리셋 상태로
// 되돌린다. PDF/PPTX 원본 파일은 라이브러리 폴더 최상위에 있는 사용자 소유
// 파일이라 절대 건드리지 않는다(이 앱의 일관된 원칙 — "앱이 소유한 데이터"는
// library.json과 thumbs/뿐).
export async function resetLibrary(
  dirHandle: FileSystemDirectoryHandle,
): Promise<LibraryData> {
  await dirHandle.removeEntry("thumbs", { recursive: true }).catch(() => {});
  await dirHandle.getDirectoryHandle("thumbs", { create: true });
  const fresh = createDefaultLibrary();
  await writeLibrary(dirHandle, fresh);
  return fresh;
}

// 다른 컴퓨터/브라우저로 옮길 때 AI 태깅을 다시 돌리지 않고 태그를 재사용하기
// 위한 내보내기 형식. 원본 파일이나 썸네일 이미지는 포함하지 않고(용량도 크고,
// 새 환경에서는 "가져오기"로 다시 만들면 되므로) 태그 사전과 각 파일의 태그
// 배정만 담는다. thumb 경로도 내려받지 않는다 — 실제 경로는 새 환경마다
// 달라지고, 매칭은 항상 file_key(파일명 기준)로만 하기 때문이다.
export interface LibraryExport {
  export_version: 1;
  tags: TagDef[];
  refs: {
    file_key: string;
    title: string;
    memo: string;
    tag_ids: string[];
    ai_tag_ids: string[];
    slides: { page_no: number; tag_ids: string[]; ai_tag_ids: string[] }[];
  }[];
}

export function exportLibraryData(library: LibraryData): LibraryExport {
  return {
    export_version: 1,
    tags: library.tags,
    refs: library.refs.map((r) => ({
      file_key: r.file_key,
      title: r.title,
      memo: r.memo,
      tag_ids: r.tag_ids,
      ai_tag_ids: r.ai_tag_ids,
      slides: r.slides.map((s) => ({
        page_no: s.page_no,
        tag_ids: s.tag_ids,
        ai_tag_ids: s.ai_tag_ids,
      })),
    })),
  };
}

export interface ImportResult {
  library: LibraryData;
  matchedCount: number;
  skippedCount: number;
}

// 내보낸 데이터를 현재 라이브러리에 병합한다. File System Access API는
// 절대경로를 앱에 알려주지 않으므로 경로로는 매칭할 수 없고, 대신 이미 이
// 앱이 파일 식별에 쓰고 있는 file_key(파일명 기준)로 매칭한다 — 즉 "가져오기"로
// 먼저 같은 이름의 PDF/PPTX를 불러와 라이브러리에 존재하는 파일만 태그가
// 복원되고, 아직 안 불러온 파일은 건너뛴다.
//
// 태그 id는 라이브러리마다 다를 수 있다: 프리셋은 id가 `kind-슬러그` 형식이라
// 항상 결정적이지만, 커스텀 태그는 무작위 UUID라 그대로는 안 맞는다. 그래서
// 커스텀 태그는 (kind, name)으로 다시 매칭하고, 없으면 새로 만들어 이어붙인다.
export function importLibraryData(
  current: LibraryData,
  imported: LibraryExport,
): ImportResult {
  const tags = [...current.tags];
  const tagIdMap = new Map<string, string>();

  // 매칭된 파일이 실제로 참조하는 태그만 그때그때 사전에 반영한다. 미리 전부
  // 병합해버리면, 한 파일도 매칭되지 않은 가져오기(순서 실수 등)에서도 JSON 안의
  // 커스텀 태그 정의가 현재 사전에 쌓이는 부작용이 생긴다.
  function resolveTagId(importedTagId: string): string | undefined {
    const cached = tagIdMap.get(importedTagId);
    if (cached) return cached;
    const importedTag = imported.tags.find((t) => t.id === importedTagId);
    if (!importedTag) return undefined;
    // 프리셋은 id가 결정적이라 id로 바로 맞고, 커스텀은 (kind, name)으로 맞춘다.
    const existing = tags.find(
      (t) =>
        t.id === importedTag.id ||
        (t.kind === importedTag.kind && t.name === importedTag.name),
    );
    if (existing) {
      tagIdMap.set(importedTagId, existing.id);
      return existing.id;
    }
    // 현재 사전에 없으면 새로 만든다. 프리셋이었다면(사용자가 태그 관리에서 지운
    // 경우) 결정적 id를 그대로 살려 되살린다 — 존재 확인 없이 id만 매핑하면
    // 삭제된 프리셋을 참조하는 고아 태그가 파일에 붙는다.
    const newTag: TagDef = {
      id: importedTag.is_preset ? importedTag.id : crypto.randomUUID(),
      name: importedTag.name,
      kind: importedTag.kind,
      is_preset: importedTag.is_preset,
    };
    tags.push(newTag);
    tagIdMap.set(importedTagId, newTag.id);
    return newTag.id;
  }

  function mapIds(ids: string[]): string[] {
    return ids
      .map((id) => resolveTagId(id))
      .filter((id): id is string => Boolean(id));
  }

  // 파일명은 항상 NFC로 정규화해서 비교한다. 앱이 만든 file_key는 이미 NFC지만,
  // macOS를 거친 한글 파일명(NFD)이 섞인 JSON도 안전하게 매칭되도록 방어한다.
  const normalize = (s: string) => s.normalize("NFC");
  let matchedCount = 0;

  const refs = current.refs.map((ref) => {
    const importedRef = imported.refs.find(
      (r) => normalize(r.file_key) === normalize(ref.file_key),
    );
    if (!importedRef) return ref;
    matchedCount += 1;
    const slides = ref.slides.map((slide) => {
      const importedSlide = importedRef.slides.find(
        (s) => s.page_no === slide.page_no,
      );
      if (!importedSlide) return slide;
      return {
        ...slide,
        tag_ids: Array.from(
          new Set([...slide.tag_ids, ...mapIds(importedSlide.tag_ids)]),
        ),
        ai_tag_ids: Array.from(
          new Set([...slide.ai_tag_ids, ...mapIds(importedSlide.ai_tag_ids)]),
        ),
      };
    });
    return {
      ...ref,
      // 제목이 아직 파일명 그대로(기본값)일 때만 내보낸 제목으로 덮어쓴다 —
      // 사용자가 이미 직접 바꾼 제목을 되돌리지 않기 위해서다.
      title: ref.title === ref.file_key ? importedRef.title : ref.title,
      memo: ref.memo || importedRef.memo,
      tag_ids: Array.from(new Set([...ref.tag_ids, ...mapIds(importedRef.tag_ids)])),
      ai_tag_ids: Array.from(
        new Set([...ref.ai_tag_ids, ...mapIds(importedRef.ai_tag_ids)]),
      ),
      slides,
    };
  });

  return {
    library: { ...current, tags, refs },
    matchedCount,
    skippedCount: imported.refs.length - matchedCount,
  };
}

export async function readLibrary(
  dirHandle: FileSystemDirectoryHandle,
): Promise<LibraryData> {
  try {
    const fileHandle = await dirHandle.getFileHandle(LIBRARY_FILE_NAME);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as LibraryData;
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotFoundError") {
      const fresh = createDefaultLibrary();
      await writeLibrary(dirHandle, fresh);
      return fresh;
    }
    throw err;
  }
}

export async function writeLibrary(
  dirHandle: FileSystemDirectoryHandle,
  data: LibraryData,
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(LIBRARY_FILE_NAME, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}
