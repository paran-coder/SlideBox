// 슬라이드 호버 확대 등 화면 표시 관련 환경설정을 localStorage에 저장/조회한다.

const SLIDE_HOVER_ZOOM_KEY = "slidebox:slide-hover-zoom";

export function getSlideHoverZoomEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(SLIDE_HOVER_ZOOM_KEY);
  return raw === null ? true : raw === "1";
}

export function setSlideHoverZoomEnabled(enabled: boolean): void {
  window.localStorage.setItem(SLIDE_HOVER_ZOOM_KEY, enabled ? "1" : "0");
}
