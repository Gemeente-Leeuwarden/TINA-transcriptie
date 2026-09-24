import { Navigate } from "react-router-dom";
import { SessionProvider } from "@/contexts/SessionContext";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { FullscreenSpinner } from "@/app/components/FullscreenSpinner";

export function ProtectedLayoutRoute() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <FullscreenSpinner />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SessionProvider>
      <Layout />
    </SessionProvider>
  );
}
