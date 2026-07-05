import { describe, expect, it } from "vitest";
import { parseAiResponse } from "./ai-tagging";

describe("parseAiResponse", () => {
  it("순수 JSON 응답을 파싱한다", () => {
    const text = '{"slides":[{"page_no":1,"style":["미니멀"],"layout":["표지"],"topic":[]}],"file":{"style":["미니멀"],"topic":["마케팅"]}}';
    expect(parseAiResponse(text)).toEqual({
      slides: [{ page_no: 1, style: ["미니멀"], layout: ["표지"], topic: [] }],
      file: { style: ["미니멀"], topic: ["마케팅"] },
    });
  });

  it("마크다운 코드펜스(```json ... ```)를 제거하고 파싱한다", () => {
    const text = '```json\n{"slides":[],"file":{"style":[],"topic":[]}}\n```';
    expect(parseAiResponse(text)).toEqual({
      slides: [],
      file: { style: [], topic: [] },
    });
  });

  it("잘못된 JSON이면 null을 반환한다", () => {
    expect(parseAiResponse("이건 JSON이 아니다")).toBeNull();
  });
});
