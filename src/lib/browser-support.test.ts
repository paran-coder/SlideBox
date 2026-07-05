import { afterEach, describe, expect, it, vi } from "vitest";
import { isKnownIncompatibleBrowser } from "./browser-support";

describe("isKnownIncompatibleBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("네이버 웨일 UA는 알려진 비호환 브라우저로 감지한다", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Whale/3.24.0.0 Safari/537.36",
    });
    expect(isKnownIncompatibleBrowser()).toBe(true);
  });

  it("일반 Chrome UA는 비호환으로 감지하지 않는다", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(isKnownIncompatibleBrowser()).toBe(false);
  });
});
