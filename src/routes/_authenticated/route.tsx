import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";

const getAuthUser = createServerFn({ method: "GET" }).handler(async () => {
  const { userId } = await auth();
  if (!userId) {
    throw redirect({ to: "/auth" });
  }
  return { userId };
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    return await getAuthUser();
  },
  component: () => (
    <div className="dark min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  ),
});
