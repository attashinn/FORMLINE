import { useEffect, useState } from "react";
import { DEV_BYPASS_OWNER_ID, readDevBypassCookie } from "@/lib/dev-bypass";

export function DevBypassBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    setActive(readDevBypassCookie());
  }, []);

  if (!import.meta.env.DEV || !active) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200"
    >
      <span className="font-medium">Dev bypass mode</span>
      <span className="text-amber-200/70"> — shared test workspace</span>
      <span className="mx-2 text-amber-200/40">·</span>
      <span className="font-mono text-[11px] text-amber-100/80">{DEV_BYPASS_OWNER_ID}</span>
    </div>
  );
}
