import { Navigate } from "react-router-dom";

/** Legacy Auth0 callback URL — redirects to home. Route removed from App.tsx. */
export default function CallbackPage() {
  return <Navigate to="/" replace />;
}

