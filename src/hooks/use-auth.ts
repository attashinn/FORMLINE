import { useAuth as useClerkAuth, useUser } from "@clerk/tanstack-react-start";

type FormattedUser = {
  id: string;
  email: string;
  imageUrl: string | null;
  user_metadata: {
    full_name: string;
  };
};

export function useAuth() {
  const { isLoaded, sessionId } = useClerkAuth();
  const { user } = useUser();

  const formattedUser: FormattedUser | null = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        imageUrl: user.imageUrl ?? null,
        user_metadata: {
          full_name: user.fullName ?? "",
        },
      }
    : null;

  return {
    session: sessionId ? { user: formattedUser } : null,
    user: formattedUser,
    loading: !isLoaded,
  };
}
