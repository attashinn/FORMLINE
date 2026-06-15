import { createMiddleware } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { syncOwnerProfileFromClerk } from "@/lib/clerk.server";
import { DEV_BYPASS_OWNER_ID } from "@/lib/dev-bypass";
import { getDeterministicUuid } from "@/lib/owner-id";

export const requireClerkAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  if (process.env.NODE_ENV === "development") {
    try {
      const { getRequestUrl, getCookie } = await import("@tanstack/react-start/server");
      const url = getRequestUrl();
      const bypassCookie = getCookie("bypass");
      if (url.searchParams.get("bypass") === "true" || bypassCookie === "true") {
        const mockUserId = DEV_BYPASS_OWNER_ID;
        return next({
          context: {
            userId: mockUserId,
            clerkUserId: "mock_clerk_user",
          },
        });
      }
    } catch (e) {
      console.warn("Failed to get request context inside requireClerkAuth:", e);
    }
  }
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized: Not logged in");
  }
  const mappedUuid = getDeterministicUuid(userId);
  await syncOwnerProfileFromClerk({ clerkUserId: userId, ownerId: mappedUuid });
  return next({
    context: {
      userId: mappedUuid,
      clerkUserId: userId,
    },
  });
});
