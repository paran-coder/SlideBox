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
