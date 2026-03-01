import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { PageSpinner } from "./ui";

/**
 * Renders children only if user has NOT yet completed onboarding.
 * If onboarded → redirects to appropriate dashboard.
 */
export default function OnboardingGuard() {
  const { user, loading } = useUser();

  if (loading) return <PageSpinner text="Loading..." />;
  if (!user) return <Navigate to="/" replace />;

  if (user.onboarded) {
    const dest = user.role === "teacher" ? "/teacher" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
}
