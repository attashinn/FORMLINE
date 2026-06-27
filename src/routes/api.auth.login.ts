import { createFileRoute } from "@tanstack/react-router";
import { handleProtectedLoginRequest } from "@/lib/auth.server";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => handleProtectedLoginRequest(request),
    },
  },
});
