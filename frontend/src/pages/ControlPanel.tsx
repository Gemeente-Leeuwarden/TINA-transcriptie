import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PasswordCard } from "@/pages/control-panel/components/PasswordCard";
import { PromptManagerCard } from "@/pages/control-panel/components/PromptManagerCard";

export default function ControlPanel() {
  useDocumentTitle("Account");
  const { token, user, logout } = useAuth();

  const isLocalUser = user?.Source === "local";
  const isAdmin = user?.Role === "admin";

  return (
    <div className="space-y-6">
      {isLocalUser && <PasswordCard token={token ?? null} onPasswordChanged={logout} />}
      <PromptManagerCard token={token ?? null} isAdmin={isAdmin} userID={user?.ID} />
    </div>
  );
}
