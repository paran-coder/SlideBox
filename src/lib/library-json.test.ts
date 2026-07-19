import { describe, expect, it } from "vitest";
import {
  exportLibraryData,
  importLibraryData,
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

describe("exportLibraryData / importLibraryData", () => {
  it("내보낸 데이터를 그대로 같은 라이브러리에 다시 가져오면 변화가 없다", () => {
    const lib = makeLibrary();
    const exported = exportLibraryData(lib);
    const { library, matchedCount, skippedCount } = importLibraryData(
      lib,
      exported,
    );
    expect(matchedCount).toBe(1);
    expect(skippedCount).toBe(0);
    expect(library.refs[0].tag_ids).toEqual(lib.refs[0].tag_ids);
    expect(library.refs[0].slides[0].tag_ids).toEqual(
      lib.refs[0].slides[0].tag_ids,
    );
  });

  it("file_key가 일치하지 않는 레퍼런스는 건너뛰고, 태그 사전도 오염시키지 않는다", () => {
    const source = makeLibrary();
    const exported = exportLibraryData(source);
    const target = makeLibrary({
      refs: [
        {
          id: "ref-2",
          file_key: "다른파일",
          title: "다른파일",
          memo: "",
          has_pptx: false,
          created_at: "",
          tag_ids: [],
          ai_tag_ids: [],
          slides: [],
        },
      ],
      tags: [
        { id: "topic-preset", name: "마케팅", kind: "topic", is_preset: true },
      ],
    });
    const { library, matchedCount, skippedCount } = importLibraryData(
      target,
      exported,
    );
    expect(matchedCount).toBe(0);
    expect(skippedCount).toBe(1);
    // 매칭된 파일이 하나도 없으면 JSON 안의 커스텀 태그 정의도 사전에 추가되면 안 된다.
    expect(library.tags).toHaveLength(1);
  });

  it("사용자가 지운 프리셋 태그는 같은 결정적 id로 되살려서 붙인다", () => {
    const source = makeLibrary({
      refs: [
        {
          id: "ref-1",
          file_key: "f1",
          title: "f1",
          memo: "",
          has_pptx: false,
          created_at: "",
          tag_ids: ["topic-preset"],
          ai_tag_ids: [],
          slides: [],
        },
      ],
    });
    const exported = exportLibraryData(source);
    // 대상 라이브러리에서는 프리셋 태그가 삭제된 상태.
    const target = makeLibrary({
      tags: [],
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
          slides: [],
        },
      ],
    });
    const { library } = importLibraryData(target, exported);
    const revived = library.tags.find((t) => t.id === "topic-preset");
    expect(revived).toBeDefined();
    expect(revived!.is_preset).toBe(true);
    expect(library.refs[0].tag_ids).toContain("topic-preset");
  });

  it("NFD로 저장된 file_key도 NFC와 정규화 비교로 매칭한다", () => {
    const koreanRef = {
      id: "ref-1",
      file_key: "회사소개서".normalize("NFC"),
      title: "회사소개서",
      memo: "",
      has_pptx: false,
      created_at: "",
      tag_ids: [],
      ai_tag_ids: [],
      slides: [],
    };
    const source = makeLibrary({ refs: [koreanRef] });
    const exported = exportLibraryData(source);
    // macOS를 거친 파일명처럼 NFD로 분해된 file_key를 흉내낸다.
    exported.refs[0].file_key = exported.refs[0].file_key.normalize("NFD");
    expect(exported.refs[0].file_key).not.toBe(koreanRef.file_key);
    const target = makeLibrary({ refs: [{ ...koreanRef }] });
    const { matchedCount } = importLibraryData(target, exported);
    expect(matchedCount).toBe(1);
  });

  it("프리셋 태그는 id 그대로 매칭되고, 커스텀 태그는 이름+종류로 다시 매칭해 새 id를 붙인다", () => {
    const source = makeLibrary();
    const exported = exportLibraryData(source);

    // 대상 라이브러리는 file_key는 같지만 커스텀 태그의 id가 다른(새로 만들어진) 상태.
    const target: LibraryData = {
      version: 1,
      tags: [
        { id: "topic-preset", name: "마케팅", kind: "topic", is_preset: true },
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
          slides: [{ page_no: 1, thumb: "thumbs/f1/p1.jpg", tag_ids: [], ai_tag_ids: [] }],
        },
      ],
    };

    const { library, matchedCount } = importLibraryData(target, exported);
    expect(matchedCount).toBe(1);
    // "used"라는 이름의 커스텀 태그가 새로 생성되어 매칭됐어야 한다.
    const newCustomTag = library.tags.find(
      (t) => !t.is_preset && t.name === "used",
    );
    expect(newCustomTag).toBeDefined();
    expect(library.refs[0].slides[0].tag_ids).toContain(newCustomTag!.id);
  });
});
