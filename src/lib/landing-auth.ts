import { useAuth } from "@clerk/tanstack-react-start";
import { useEffect, useState } from "react";

export function useLandingAuth() {
  const { isSignedIn: clerkSignedIn } = useAuth();
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsBypassed(document.cookie.includes("bypass=true"));
    }
  }, []);

  return clerkSignedIn || isBypassed;
}
