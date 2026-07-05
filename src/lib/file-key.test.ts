import { describe, expect, it } from "vitest";
import { extractFileKey, getImportableExtension } from "./file-key";

describe("extractFileKey", () => {
  it("확장자를 제거한다", () => {
    expect(extractFileKey("강남프로젝트_제안서.pdf")).toBe("강남프로젝트_제안서");
  });

  it("여러 점이 있어도 마지막 확장자만 제거한다", () => {
    expect(extractFileKey("v1.2.final.pptx")).toBe("v1.2.final");
  });

  it("앞뒤 공백을 trim한다", () => {
    expect(extractFileKey("  제목  .pdf")).toBe("제목");
  });

  it("NFD로 분해된 한글 파일명을 NFC로 정규화해 NFC 이름과 동일하게 만든다", () => {
    const nfcName = "강남프로젝트_제안서.pdf".normalize("NFC");
    const nfdName = "강남프로젝트_제안서.pdf".normalize("NFD");
    expect(extractFileKey(nfdName)).toBe(extractFileKey(nfcName));
  });

  it("확장자가 없으면 전체를 file_key로 취급한다", () => {
    expect(extractFileKey("확장자없음")).toBe("확장자없음");
  });
});

describe("getImportableExtension", () => {
  it("pdf 확장자를 인식한다(대소문자 무관)", () => {
    expect(getImportableExtension("a.PDF")).toBe("pdf");
  });

  it("pptx 확장자를 인식한다", () => {
    expect(getImportableExtension("a.pptx")).toBe("pptx");
  });

  it("지원하지 않는 확장자는 null을 반환한다", () => {
    expect(getImportableExtension("a.png")).toBeNull();
  });

  it("확장자가 없으면 null을 반환한다", () => {
    expect(getImportableExtension("noext")).toBeNull();
  });
});
