import { describe, expect, it } from "vitest";
import {
  pruneAllUnusedCustomTags,
  pruneUnusedCustomTag,
  type LibraryData,
} from "./library-json";

function makeLibrary(overrides: Partial<LibraryData> = {}): LibraryData {
  return {
    version: 1,
    tags: [
      { id: "topic-preset", name: "마케팅", kind: "topic", is_preset: true },
      { id: "custom-used", name: "used", kind: "topic", is_preset: false },
      { id: "custom-unused", name: "unused", kind: "topic", is_preset: false },
    ],
    refs: [
      {
        id: "ref-1",
        file_key: "f1",
        title: "f1",
        memo: "",
        has_pptx: false,
        created_at: "",
        tag_ids: [],
        ai_tag_ids: [],
        slides: [
          {
            page_no: 1,
            thumb: "thumbs/f1/p1.jpg",
            tag_ids: ["custom-used"],
            ai_tag_ids: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("pruneUnusedCustomTag", () => {
  it("프리셋 태그는 안 쓰여도 지우지 않는다", () => {
    const lib = makeLibrary();
    const next = pruneUnusedCustomTag(lib, "topic-preset");
    expect(next.tags.map((t) => t.id)).toContain("topic-preset");
  });

  it("다른 곳에서 쓰이는 커스텀 태그는 지우지 않는다", () => {
    const lib = makeLibrary();
    const next = pruneUnusedCustomTag(lib, "custom-used");
    expect(next.tags.map((t) => t.id)).toContain("custom-used");
  });

  it("아무 데도 안 쓰이는 커스텀 태그는 사전에서 제거한다", () => {
    const lib = makeLibrary();
    const next = pruneUnusedCustomTag(lib, "custom-unused");
    expect(next.tags.map((t) => t.id)).not.toContain("custom-unused");
  });
});

describe("pruneAllUnusedCustomTags", () => {
  it("미사용 커스텀 태그만 한 번에 걷어내고 프리셋·사용중 태그는 남긴다", () => {
    const lib = makeLibrary();
    const next = pruneAllUnusedCustomTags(lib);
    expect(next.tags.map((t) => t.id)).toEqual(["topic-preset", "custom-used"]);
  });

  it("정리할 게 없으면 같은 배열 길이를 유지한다", () => {
    const lib = makeLibrary({
      tags: [
        { id: "topic-preset", name: "마케팅", kind: "topic", is_preset: true },
        { id: "custom-used", name: "used", kind: "topic", is_preset: false },
      ],
    });
    const next = pruneAllUnusedCustomTags(lib);
    expect(next.tags).toHaveLength(2);
  });
});
