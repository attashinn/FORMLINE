import { useAuth as useClerkAuth, useUser } from "@clerk/tanstack-react-start";

export function useAuth() {
  const { isLoaded, userId, sessionId } = useClerkAuth();
  const { user } = useUser();

  const formattedUser = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        user_metadata: {
          full_name: user.fullName ?? "",
        },
      }
    : null;

  return {
    session: sessionId ? { user: formattedUser } : null,
    user: formattedUser as any,
    loading: !isLoaded,
  };
}
