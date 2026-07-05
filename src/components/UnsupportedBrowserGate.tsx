// 브라우저 지원 여부를 확인하고, 미지원 시 안내 화면으로 나머지 화면을 막는다.
"use client";

import { useEffect, useState } from "react";
import {
  isBrowserSupported,
  isKnownIncompatibleBrowser,
} from "@/lib/browser-support";

export default function UnsupportedBrowserGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [knownIncompatible, setKnownIncompatible] = useState(false);

  useEffect(() => {
    // window/navigator는 클라이언트에서만 확인 가능해 SSR 결과와 다를 수 있다.
    // 마운트 후 한 번만 갱신해 하이드레이션 불일치를 피한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(isBrowserSupported());
    setKnownIncompatible(isKnownIncompatibleBrowser());
  }, []);

  if (supported === null) {
    return null;
  }

  if (!supported) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">지원하지 않는 브라우저입니다</h1>
          <p className="mt-4 text-sm text-neutral-600">
            이 앱은 Chrome 또는 Edge 데스크톱에서만 사용할 수 있습니다.
            <br />
            Firefox, Safari, 모바일 브라우저는 지원하지 않습니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {knownIncompatible && (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
          이 브라우저(네이버 웨일)에서는 과거 폴더 접근 관련 문제가 있었습니다.
          문제가 발생하면 Chrome 또는 Edge를 사용해 주세요.
        </div>
      )}
      {children}
    </>
  );
}
