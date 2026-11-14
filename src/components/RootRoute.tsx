import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import Index from "@/pages/Index";
import { PageLoader } from "@/components/PageLoader";
import { shouldSkipLandingForReturnVisitor } from "@/lib/growth/firstVisit";
import { recordLandingView } from "@/lib/growth/funnelEvents";
import { useEffect } from "react";

/**
 * Root route. Anonymous visitors (first-time and returning) see the marketing
 * home at `/`; signed-in users go straight to `/chatbot`. The landing-skip for
 * return visitors is currently disabled — `shouldSkipLandingForReturnVisitor`
 * always returns false (see src/lib/growth/firstVisit.ts).
 */
export default function RootRoute() {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading) recordLandingView("/");
  }, [loading]);

  if (loading) return <PageLoader />;
  // Signed-in users skip marketing entirely.
  if (user) return <Navigate to="/chatbot" replace />;
  if (shouldSkipLandingForReturnVisitor()) return <Navigate to="/chatbot" replace />;
  return <Index />;
}
