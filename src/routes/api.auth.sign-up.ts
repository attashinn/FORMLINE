import { createFileRoute } from "@tanstack/react-router";
import { handleSignUpRequest, parseAuthRequestBody } from "@/lib/auth.server";

export const Route = createFileRoute("/api/auth/sign-up")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await parseAuthRequestBody(request);
        return handleSignUpRequest(body);
      },
    },
  },
});
