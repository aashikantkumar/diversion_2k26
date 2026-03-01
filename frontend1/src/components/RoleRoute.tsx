import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { PageSpinner } from "./ui";
import type { Role } from "../types";

interface RoleRouteProps {
  /** Allowed roles — user is redirected if their role is not in this list */
  allowed: Role[];
}

/**
 * Wraps routes that require a specific role.
 * Also handles onboarding redirect if user hasn't onboarded yet.
 */
export default function RoleRoute({ allowed }: RoleRouteProps) {
  const { user, loading } = useUser();

  if (loading) return <PageSpinner text="Loading profile..." />;

  if (!user) return <Navigate to="/" replace />;

  // If not onboarded yet, redirect to onboarding
  if (!user.onboarded) {
    return <Navigate to="/onboarding/role" replace />;
  }

  // If role doesn't match, redirect to the right dashboard
  if (!allowed.includes(user.role)) {
    const dest = user.role === "teacher" ? "/teacher" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
}
