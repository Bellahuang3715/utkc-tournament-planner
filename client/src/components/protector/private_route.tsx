import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import { hasScorekeeperTokenForPath } from "../../utils/scorekeeper_access";
import { createAxios } from "../../services/adapter";
import FinishSignup from "../auth/finish_signup";

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

  const [accountGate, setAccountGate] = useState<"checking" | "ready" | "needs_country">(
    "checking",
  );

  useEffect(() => {
    if (!loading && !user && !scorekeeperAllowed) {
      void router.replace("/welcome");
    }
  }, [user, loading, router, scorekeeperAllowed]);

  useEffect(() => {
    if (loading) return;
    if (!user || scorekeeperAllowed) {
      setAccountGate("ready");
      return;
    }

    let cancelled = false;
    setAccountGate("checking");
    (async () => {
      try {
        const axiosInstance = await createAxios();
        await axiosInstance.get("users/me");
        if (!cancelled) setAccountGate("ready");
      } catch (error: any) {
        const detail = error?.response?.data?.detail;
        if (!cancelled) {
          setAccountGate(detail === "User not found" ? "needs_country" : "ready");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, scorekeeperAllowed]);

  if (loading || (user && !scorekeeperAllowed && accountGate === "checking")) {
    return null;
  }

  if (!user && !scorekeeperAllowed) {
    return null;
  }

  if (accountGate === "needs_country") {
    return <FinishSignup onComplete={() => setAccountGate("ready")} />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
