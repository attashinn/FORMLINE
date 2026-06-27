import { useEffect, useRef, useState } from "react";

const LOGOS = ["Slack", "Framer", "Netflix", "Google", "LinkedIn", "Instagram", "Meta"] as const;

export function HeroLogoMarquee() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: "100px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative mx-auto mt-12 w-full max-w-5xl select-none overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 z-10 h-full w-20 bg-gradient-to-r from-[#0A0A0B] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 z-10 h-full w-20 bg-gradient-to-l from-[#0A0A0B] to-transparent md:w-40"
      />

      <div
        className={`flex w-max ${isVisible ? "animate-marquee-scroll" : ""}`}
        style={{ animationPlayState: isVisible ? "running" : "paused" }}
      >
        {[0, 1].map((set) => (
          <div key={set} className="flex shrink-0 items-center" aria-hidden={set === 1}>
            {LOGOS.map((name) => (
              <span
                key={`${set}-${name}`}
                className="mx-8 text-sm font-semibold tracking-wide text-white/35 whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
