// 브라우저 탭 파비콘 — 코드로 생성(별도 이미지 파일 불필요). 겹친 슬라이드 로고.
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 4,
            top: 6,
            width: 20,
            height: 14,
            borderRadius: 3,
            background: "#c7d2fe",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 6,
            top: 8,
            width: 20,
            height: 14,
            borderRadius: 3,
            background: "#818cf8",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 10,
            width: 20,
            height: 14,
            borderRadius: 3,
            background: "#4f46e5",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
