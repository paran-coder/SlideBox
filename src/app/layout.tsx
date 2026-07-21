import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import UnsupportedBrowserGate from "@/components/UnsupportedBrowserGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://slidebox.vercel.app"),
  title: {
    default: "슬라이드박스",
    template: "%s · 슬라이드박스",
  },
  description:
    "내 컴퓨터의 PDF/PPTX 레퍼런스를 태그로 정리하는 개인용 라이브러리. 서버 없이 브라우저에서 로컬 폴더를 직접 다룹니다.",
  openGraph: {
    title: "슬라이드박스",
    description:
      "내 컴퓨터의 PDF/PPTX 레퍼런스를 태그로 정리하는 개인용 라이브러리. 서버 없이 브라우저에서 로컬 폴더를 직접 다룹니다.",
    url: "https://slidebox.vercel.app",
    siteName: "슬라이드박스",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "슬라이드박스",
    description:
      "내 컴퓨터의 PDF/PPTX 레퍼런스를 태그로 정리하는 개인용 라이브러리. 서버 없이 브라우저에서 로컬 폴더를 직접 다룹니다.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UnsupportedBrowserGate>{children}</UnsupportedBrowserGate>
        <Analytics />
      </body>
    </html>
  );
}
