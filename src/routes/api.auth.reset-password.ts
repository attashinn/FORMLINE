import { createFileRoute } from "@tanstack/react-router";
import { handleResetPasswordRequest, parseAuthRequestBody } from "@/lib/auth.server";

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await parseAuthRequestBody(request);
        return handleResetPasswordRequest(body);
      },
    },
  },
});
