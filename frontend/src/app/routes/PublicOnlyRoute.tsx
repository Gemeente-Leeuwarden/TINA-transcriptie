import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FullscreenSpinner } from "@/app/components/FullscreenSpinner";

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <FullscreenSpinner />;
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
