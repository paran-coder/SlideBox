// 짧게 표시되고 사라지는 "저장됨"류 안내 토스트. 클립보드 복사 안내에도 재사용한다.
"use client";

import { useEffect, useState } from "react";

export interface ToastTrigger {
  text: string;
  id: number;
}

interface SaveToastProps {
  trigger: ToastTrigger | null;
}

export default function SaveToast({ trigger }: SaveToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1600);
    return () => window.clearTimeout(timer);
  }, [trigger]);

  if (!visible || !trigger) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black px-4 py-2 text-sm text-white shadow-lg">
      {trigger.text}
    </div>
  );
}
