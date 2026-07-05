// 브라우저에서 사용자의 Anthropic API 키로 슬라이드 이미지를 태깅하고 library.json에 반영한다.

import { getApiKey } from "@/lib/api-key";
import type { LibraryData, RefEntry, TagKind } from "@/lib/library-json";
import { writeLibrary } from "@/lib/library-json";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const BATCH_SIZE = 10;

export class AiTaggingUnauthorizedError extends Error {}

interface ParsedSlideTags {
  page_no: number;
  style?: string[];
  layout?: string[];
  topic?: string[];
}

interface ParsedAiResponse {
  slides?: ParsedSlideTags[];
  file?: { style?: string[]; topic?: string[] };
}

interface AnthropicMessageResponse {
  content?: { type: string; text?: string }[];
}

function tagNamesByKind(library: LibraryData, kind: TagKind): string[] {
  return library.tags.filter((t) => t.kind === kind).map((t) => t.name);
}

function buildPrompt(
  styleDict: string[],
  layoutDict: string[],
  topicDict: string[],
): string {
  return [
    "당신은 PPT 슬라이드 이미지를 분류하는 도구다.",
    "각 슬라이드에 대해 아래 사전에 있는 태그만 골라라. 사전에 없는 단어는 절대 만들지 마라.",
    `스타일 사전: [${styleDict.join(", ")}]`,
    `레이아웃 사전: [${layoutDict.join(", ")}]`,
    `주제 사전: [${topicDict.join(", ")}]`,
    "슬라이드당 스타일 1~2개, 레이아웃 1개, 주제 0~1개.",
    "마지막으로 이번 요청에 포함된 슬라이드들을 바탕으로 파일 전체에 대한 태그(스타일 1~2, 주제 1)도 골라라.",
    '응답은 JSON만: {"slides":[{"page_no":1,"style":[],"layout":[],"topic":[]}],"file":{"style":[],"topic":[]}}',
  ].join("\n");
}

export function parseAiResponse(text: string): ParsedAiResponse | null {
  const stripped = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(stripped) as ParsedAiResponse;
  } catch {
    return null;
  }
}

function filterKnown(names: string[] | undefined, dict: string[]): string[] {
  if (!names) return [];
  const known = new Set(dict);
  return names.filter((n) => known.has(n));
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ref의 file_key로 thumbs/{file_key}/의 슬라이드 이미지를 읽어 Anthropic API에 직접 요청하고,
// 결과를 library.json의 태그로 반영한다. 사전에 없는 태그는 저장하지 않는다.
export async function runAiTagging(
  dirHandle: FileSystemDirectoryHandle,
  library: LibraryData,
  refId: string,
): Promise<LibraryData> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API 키가 설정되어 있지 않습니다. 설정에서 등록해 주세요.");
  }

  const ref = library.refs.find((r) => r.id === refId);
  if (!ref) {
    throw new Error("레퍼런스를 찾을 수 없습니다.");
  }
  if (ref.slides.length === 0) {
    return library;
  }

  const thumbsRoot = await dirHandle.getDirectoryHandle("thumbs");
  const slideDir = await thumbsRoot.getDirectoryHandle(ref.file_key);

  const styleDict = tagNamesByKind(library, "style");
  const layoutDict = tagNamesByKind(library, "layout");
  const topicDict = tagNamesByKind(library, "topic");
  const nameToId = new Map(library.tags.map((t) => [t.name, t.id] as const));

  const slideTagMap = new Map<
    number,
    { style: string[]; layout: string[]; topic: string[] }
  >();
  const fileStyle = new Set<string>();
  const fileTopic = new Set<string>();

  for (let i = 0; i < ref.slides.length; i += BATCH_SIZE) {
    const batch = ref.slides.slice(i, i + BATCH_SIZE);

    const content: Array<Record<string, unknown>> = [
      { type: "text", text: buildPrompt(styleDict, layoutDict, topicDict) },
    ];
    for (const slide of batch) {
      const fileName = slide.thumb.split("/").pop() ?? `p${slide.page_no}.jpg`;
      const fileHandle = await slideDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const base64 = await blobToBase64(file);
      content.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: base64 },
      });
      content.push({ type: "text", text: `위 이미지는 페이지 ${slide.page_no}번이다.` });
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: "user", content }],
      }),
    });

    if (response.status === 401) {
      throw new AiTaggingUnauthorizedError(
        "API 키가 유효하지 않습니다. 설정에서 확인해 주세요.",
      );
    }
    if (!response.ok) {
      console.error("AI 태깅 요청 실패", response.status, await response.text());
      continue;
    }

    const data = (await response.json()) as AnthropicMessageResponse;
    const text = data.content?.[0]?.text ?? "";
    const parsed = parseAiResponse(text);
    if (!parsed) {
      console.error("AI 응답 파싱 실패", text);
      continue;
    }

    for (const s of parsed.slides ?? []) {
      slideTagMap.set(s.page_no, {
        style: filterKnown(s.style, styleDict).slice(0, 2),
        layout: filterKnown(s.layout, layoutDict).slice(0, 1),
        topic: filterKnown(s.topic, topicDict).slice(0, 1),
      });
    }
    if (parsed.file) {
      filterKnown(parsed.file.style, styleDict)
        .slice(0, 2)
        .forEach((name) => fileStyle.add(name));
      filterKnown(parsed.file.topic, topicDict)
        .slice(0, 1)
        .forEach((name) => fileTopic.add(name));
    }
  }

  const namesToIds = (names: string[]): string[] =>
    names
      .map((name) => nameToId.get(name))
      .filter((id): id is string => Boolean(id));

  const updatedSlides = ref.slides.map((slide) => {
    const picked = slideTagMap.get(slide.page_no);
    if (!picked) return slide;
    const ids = namesToIds([...picked.style, ...picked.layout, ...picked.topic]);
    return {
      ...slide,
      tag_ids: Array.from(new Set([...slide.tag_ids, ...ids])),
      ai_tag_ids: Array.from(new Set([...slide.ai_tag_ids, ...ids])),
    };
  });

  const fileIds = namesToIds([...fileStyle, ...fileTopic]);
  const updatedRef: RefEntry = {
    ...ref,
    slides: updatedSlides,
    tag_ids: Array.from(new Set([...ref.tag_ids, ...fileIds])),
    ai_tag_ids: Array.from(new Set([...ref.ai_tag_ids, ...fileIds])),
  };

  const refs = library.refs.map((r) => (r.id === refId ? updatedRef : r));
  const next: LibraryData = { ...library, refs };
  await writeLibrary(dirHandle, next);
  return next;
}
