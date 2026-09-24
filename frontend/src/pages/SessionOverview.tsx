import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { SessionList } from "@/pages/session-overview/components/SessionList";
import { SessionOverviewDetailPanel } from "@/pages/session-overview/components/SessionOverviewDetailPanel";
import { useSessionBuckets } from "@/pages/session-overview/hooks/useSessionBuckets";
import { useSessionOverviewDetail } from "@/pages/session-overview/hooks/useSessionOverviewDetail";
import type { PastSession, SessionDetailSummary } from "@/pages/session-overview/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionOverview() {
  useDocumentTitle("Sessions");
  const { token } = useAuth();
  const navigate = useNavigate();
  const { owned, guest } = useSessionBuckets(token);

  const [selected, setSelected] = useState<{
    session: PastSession;
    side: "owner" | "guest";
  } | null>(null);

  const isActiveStatus = (status: string) => status === "new" || status === "recording";
  const {
    detail,
    members,
    detailLoading,
    detailError,
    membersError,
    inviteEmail,
    inviteRole,
    isInviting,
    removeBusy,
    onlineUserIds,
    canManageMembers,
    canInviteMembers,
    setInviteEmail,
    setInviteRole,
    inviteMember,
    removeMember,
  } = useSessionOverviewDetail(token, selected);

  const openSession = useCallback(
    (session: PastSession | SessionDetailSummary) => {
      if (isActiveStatus(session.status)) {
        navigate(`/?join=${session.sessionId}`);
        return;
      }
      navigate(`/session/${session.sessionId}`);
    },
    [navigate]
  );

  const detailPanel = (
    <div className="rounded-md border bg-muted/10 px-3 py-3 text-xs transition-all duration-300 ease-out">
      <SessionOverviewDetailPanel
        detail={detail}
        detailLoading={detailLoading}
        detailError={detailError}
        members={members}
        membersError={membersError}
        canInviteMembers={canInviteMembers}
        canManageMembers={canManageMembers}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        isInviting={isInviting}
        removeBusy={removeBusy}
        onlineUserIds={onlineUserIds}
        onClose={() => setSelected(null)}
        onOpenSession={() => detail && openSession(detail)}
        onInviteSubmit={inviteMember}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onRemoveMember={removeMember}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overzicht</CardTitle>
        <CardDescription>Bekijk je afgeronde sessies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            {selected?.side === "guest" && detailPanel}
            {selected?.side !== "guest" && (
              <SessionList
                title="Eigen sessies"
                loading={owned.loading}
                error={owned.error}
                sessions={owned.sessions}
                page={owned.page}
                totalPages={owned.totalPages}
                emptyText="Nog geen eigen sessies."
                onSelect={(session) => setSelected({ session, side: "owner" })}
                onPrevPage={() => owned.setPage((prev) => Math.max(1, prev - 1))}
                onNextPage={() => owned.setPage((prev) => Math.min(owned.totalPages, prev + 1))}
              />
            )}
          </div>

          <div className="space-y-3">
            {selected?.side === "owner" && detailPanel}
            {selected?.side !== "owner" && (
              <SessionList
                title="Gast-sessies"
                loading={guest.loading}
                error={guest.error}
                sessions={guest.sessions}
                page={guest.page}
                totalPages={guest.totalPages}
                emptyText="Nog geen gast-sessies."
                onSelect={(session) => setSelected({ session, side: "guest" })}
                onPrevPage={() => guest.setPage((prev) => Math.max(1, prev - 1))}
                onNextPage={() => guest.setPage((prev) => Math.min(guest.totalPages, prev + 1))}
                showRole
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
