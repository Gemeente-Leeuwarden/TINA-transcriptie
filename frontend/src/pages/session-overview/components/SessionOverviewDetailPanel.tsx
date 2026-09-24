import { type FormEvent } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { formatDate, formatRole, formatStatus } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SessionDetailSummary, SessionMember } from "@/pages/session-overview/types";

interface SessionOverviewDetailPanelProps {
  detail: SessionDetailSummary | null;
  detailLoading: boolean;
  detailError: string | null;
  members: SessionMember[];
  membersError: string | null;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  inviteEmail: string;
  inviteRole: "owner" | "editor" | "viewer";
  isInviting: boolean;
  removeBusy: number | null;
  onlineUserIds: Set<number>;
  onClose: () => void;
  onOpenSession: () => void;
  onInviteSubmit: (event: FormEvent) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: "owner" | "editor" | "viewer") => void;
  onRemoveMember: (userID: number) => void;
}

export function SessionOverviewDetailPanel({
  detail,
  detailLoading,
  detailError,
  members,
  membersError,
  canInviteMembers,
  canManageMembers,
  inviteEmail,
  inviteRole,
  isInviting,
  removeBusy,
  onlineUserIds,
  onClose,
  onOpenSession,
  onInviteSubmit,
  onInviteEmailChange,
  onInviteRoleChange,
  onRemoveMember,
}: SessionOverviewDetailPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{detail ? `Sessie #${detail.sessionId}` : "Sessie"}</div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Sluiten
        </Button>
      </div>
      {detailLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Bezig met laden...
        </div>
      ) : detailError ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{detailError}</div>
      ) : detail ? (
        <>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>Status: {formatStatus(detail.status)}</div>
            <div>Rol: {formatRole(detail.role)}</div>
            <div>Gestart: {formatDate(detail.createdAt)}</div>
            <div>Laatst bijgewerkt: {formatDate(detail.updatedAt)}</div>
          </div>
          {detail.files.length > 0 && (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <div className="font-medium">Bestanden</div>
              <div className="mt-1 space-y-1 text-muted-foreground">
                {detail.files.map((file) => (
                  <div key={file}>{file}</div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onOpenSession}>
              Openen
            </Button>
          </div>
        </>
      ) : null}

      {detail && (
        <div className="space-y-3">
          <Separator />
          <div className="text-sm font-medium">Deelnemers</div>
          {canInviteMembers && (
            <form onSubmit={onInviteSubmit} className="space-y-2">
              <div className="text-xs text-muted-foreground">Uitnodigen per e-mail</div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="collega@example.com"
                  value={inviteEmail}
                  onChange={(event) => onInviteEmailChange(event.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm text-foreground shadow-xs outline-none"
                />
                <Button type="submit" size="sm" disabled={isInviting}>
                  {isInviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                </Button>
              </div>
              <select
                value={inviteRole}
                onChange={(event) => onInviteRoleChange(event.target.value as "owner" | "editor" | "viewer")}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm text-foreground shadow-xs outline-none"
              >
                <option value="owner">Eigenaar</option>
                <option value="editor">Moderator</option>
                <option value="viewer">Gast</option>
              </select>
            </form>
          )}
          {!canInviteMembers && canManageMembers && (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Uitnodigen is uitgeschakeld voor dit doel.
            </div>
          )}
          {membersError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{membersError}</div>
          )}
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nog geen deelnemers.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <span
                        className={`inline-block size-1.5 rounded-full ${
                          onlineUserIds.has(member.userId) ? "bg-emerald-500" : "bg-muted-foreground/30"
                        }`}
                      />
                      {member.email}
                    </div>
                    <div className="text-muted-foreground">{formatRole(member.role)}</div>
                  </div>
                  {member.role !== "owner" && canManageMembers && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveMember(member.userId)}
                      disabled={removeBusy === member.userId}
                    >
                      {removeBusy === member.userId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
