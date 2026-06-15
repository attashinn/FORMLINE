import { useEffect, type ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    let rafId: number | undefined;
    let destroy: (() => void) | undefined;

    (async () => {
      const { default: Lenis } = await import("lenis");
      const lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
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
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      destroy?.();
    };
  }, []);

  return <>{children}</>;
}
