import { createFileRoute } from "@tanstack/react-router";
import { handleRequestPasswordResetRequest, parseAuthRequestBody } from "@/lib/auth.server";

export const Route = createFileRoute("/api/auth/request-password-reset")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await parseAuthRequestBody(request);
        return handleRequestPasswordResetRequest(body);
      },
    },
  },
});
