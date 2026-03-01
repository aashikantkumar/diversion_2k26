import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { PageSpinner } from "./ui";

/**
 * Wraps routes that require a logged-in user.
 * Redirects to /login if not authenticated.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useUser();
  const location = useLocation();

  if (loading) return <PageSpinner text="Checking authentication..." />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
