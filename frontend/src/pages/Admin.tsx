import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AdminMessagesTab } from "@/pages/admin/components/AdminMessagesTab";
import { AdminPromptsTab } from "@/pages/admin/components/AdminPromptsTab";
import { AdminPurposesTab } from "@/pages/admin/components/AdminPurposesTab";
import { AdminQueuesTab } from "@/pages/admin/components/AdminQueuesTab";
import { AdminSessionsTab } from "@/pages/admin/components/AdminSessionsTab";
import { AdminTabsNav } from "@/pages/admin/components/AdminTabsNav";
import { AdminUsersTab } from "@/pages/admin/components/AdminUsersTab";
import type { AdminTab } from "@/pages/admin/types";

export default function Admin() {
  useDocumentTitle("Admin");
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  if (user?.Role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <AdminTabsNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "prompts" && <AdminPromptsTab token={token ?? null} />}
      {activeTab === "purposes" && <AdminPurposesTab token={token ?? null} />}
      {activeTab === "users" && <AdminUsersTab token={token ?? null} />}
      {activeTab === "sessions" && <AdminSessionsTab token={token ?? null} />}
      {activeTab === "queues" && <AdminQueuesTab token={token ?? null} />}
      {activeTab === "messages" && <AdminMessagesTab token={token ?? null} />}
    </div>
  );
}
