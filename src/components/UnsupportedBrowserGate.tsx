// 브라우저 지원 여부를 확인하고, 미지원 시 안내 화면으로 나머지 화면을 막는다.
"use client";

import { useEffect, useState } from "react";
import { isBrowserSupported } from "@/lib/browser-support";

export default function UnsupportedBrowserGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(isBrowserSupported());
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

  return <>{children}</>;
}
