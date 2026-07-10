// 링크 공유 시 노출되는 OG 카드 이미지 — 코드로 생성(별도 이미지 파일 불필요).
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#171717",
          color: "#fff",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "#fff",
            color: "#171717",
            fontSize: 36,
            fontWeight: 700,
            marginBottom: 40,
          }}
        >
          S
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, display: "flex" }}>
          슬라이드박스
        </div>
        <div style={{ fontSize: 28, color: "#a3a3a3", marginTop: 20, display: "flex" }}>
          내 컴퓨터의 PDF/PPTX 레퍼런스를 태그로 정리하는 개인용 라이브러리
        </div>
      </div>
    ),
    { ...size },
  );
}
