import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

const LENIS_OPTIONS = {
  lerp: 0.08,
  duration: 1.2,
  smoothWheel: true,
  wheelMultiplier: 0.95,
  allowNestedScroll: true,
  prevent: (node: HTMLElement) => {
    if (node.closest("input, textarea, select, [contenteditable='true']")) return true;
    const selection = window.getSelection();
    if (selection && selection.type === "Range" && selection.toString().length > 0) return true;
    return false;
  },
} as const;

function shouldUseSmoothScroll(pathname: string) {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  // Canvas editor + nested scroll panes need native wheel/pointer behavior.
  if (pathname.startsWith("/automations")) return false;
  // Public client-facing pages keep native scroll (embedded forms, portals).
  if (pathname.startsWith("/f/") || pathname.startsWith("/portal/")) return false;
  return true;
}

function clearLenisArtifacts() {
  for (const el of [document.documentElement, document.body]) {
    el.classList.remove("lenis", "lenis-smooth", "lenis-stopped", "lenis-scrolling");
  }
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    clearLenisArtifacts();

    if (!shouldUseSmoothScroll(pathname)) {
      return;
    }

    let rafId: number | undefined;
    let lenis: import("lenis").default | undefined;
    let cancelled = false;

    void (async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;

      lenis = new Lenis(LENIS_OPTIONS);

      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      requestAnimationFrame(() => lenis?.resize());
    })();

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      lenis?.destroy();
      clearLenisArtifacts();
    };
  }, [pathname]);

  return <>{children}</>;
}
