/** Mock owner UUID for ?bypass=true / bypass cookie — development only (see auth.middleware.ts). */
export const DEV_BYPASS_OWNER_ID = "00000000-0000-0000-0000-000000000000";

export function readDevBypassCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("bypass=true");
}
