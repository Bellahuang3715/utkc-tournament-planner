import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import { hasScorekeeperTokenForPath } from "../../utils/scorekeeper_access";

/** Organizer gate. Guests may access score pages if they have a scorekeeper token. */
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isScoresPath =
    router.pathname.includes("/tournaments/[id]/scores") ||
    (typeof router.asPath === "string" &&
      /\/tournaments\/\d+\/scores/.test(router.asPath));

  const scorekeeperAllowed =
    isScoresPath && hasScorekeeperTokenForPath(router.asPath);

  useEffect(() => {
    if (!loading && !user && !scorekeeperAllowed) {
      void router.replace("/welcome");
    }
  }, [user, loading, router, scorekeeperAllowed]);

  if (loading) {
    return null;
  }

  if (!user && !scorekeeperAllowed) {
    return null;
  }

  return <>{children}</>;
};

export default PrivateRoute;
