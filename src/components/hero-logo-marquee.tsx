const LOGOS = [
  "slack",
  "framer",
  "netflix",
  "google",
  "linkedin",
  "instagram",
  "facebook",
] as const;

const LOGO_BASE =
  "https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/companyLogo";

export function HeroLogoMarquee() {
  return (
    <div className="relative mx-auto mt-12 w-full max-w-5xl select-none overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 z-10 h-full w-20 bg-gradient-to-r from-[#0A0A0B] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 z-10 h-full w-20 bg-gradient-to-l from-[#0A0A0B] to-transparent md:w-40"
      />

      <div className="animate-marquee-scroll flex w-max will-change-transform">
        {[0, 1].map((set) => (
          <div key={set} className="flex shrink-0 items-center">
            {LOGOS.map((name) => (
              <img
                key={`${set}-${name}`}
                src={`${LOGO_BASE}/${name}.svg`}
                alt={name.charAt(0).toUpperCase() + name.slice(1)}
                className="mx-6 h-8 w-auto object-contain opacity-50 brightness-0 invert"
                draggable={false}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
