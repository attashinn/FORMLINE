import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

const MARKETING_PATHS = new Set([
  "/",
  "/features",
  "/templates",
  "/workspace",
  "/use-cases",
  "/how-it-works",
  "/pricing",
]);

function shouldUseSmoothScroll(pathname: string) {
  if (typeof window === "undefined") return false;
  if (!MARKETING_PATHS.has(pathname)) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.matchMedia("(pointer: coarse)").matches) return false;
  if (window.innerWidth < 1024) return false;
  return true;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!shouldUseSmoothScroll(pathname)) return;

    let rafId: number | undefined;
    let destroy: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;

      const lenis = new Lenis({
        duration: 1,
        smoothWheel: true,
        allowNestedScroll: true,
      });

      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
      destroy = () => lenis.destroy();
    })();

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      destroy?.();
    };
  }, [pathname]);

  return <>{children}</>;
}
