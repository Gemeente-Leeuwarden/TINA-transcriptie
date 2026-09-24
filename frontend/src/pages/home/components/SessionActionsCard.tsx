import { type FormEvent } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { formatRole } from "@/lib/formatters";
import type { ActiveSessionSummary, SessionState } from "@/contexts/session/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SessionActionsCardProps {
  connected: boolean;
  session: SessionState;
  activeSessions: ActiveSessionSummary[];
  canManageMembers: boolean;
  canInviteMembers: boolean;
  inviteEmail: string;
  inviteRole: "owner" | "editor" | "viewer";
  joinId: string;
  isJoining: boolean;
  onInviteSubmit: (event: FormEvent) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: "owner" | "editor" | "viewer") => void;
  onJoinSubmit: (event: FormEvent) => void;
  onJoinIdChange: (value: string) => void;
  onRefreshSessions: () => void | Promise<void>;
  onJoinSession: (sessionId: number) => void | Promise<void>;
}

export function SessionActionsCard({
  connected,
  session,
  activeSessions,
  canManageMembers,
  canInviteMembers,
  inviteEmail,
  inviteRole,
  joinId,
  isJoining,
  onInviteSubmit,
  onInviteEmailChange,
  onInviteRoleChange,
  onJoinSubmit,
  onJoinIdChange,
  onRefreshSessions,
  onJoinSession,
}: SessionActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessie</CardTitle>
        <CardDescription>Nodig deelnemers uit of sluit aan bij een bestaande sessie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.isRecording && canInviteMembers && (
          <form onSubmit={onInviteSubmit} className="space-y-2">
            <Label htmlFor="invite-email">Uitnodigen per e-mail</Label>
            <div className="flex gap-2">
              <Input
                id="invite-email"
                type="email"
                placeholder="collega@example.com"
                value={inviteEmail}
                onChange={(event) => onInviteEmailChange(event.target.value)}
              />
              <Button type="submit" size="default">
                <UserPlus className="size-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Rol</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(event) => onInviteRoleChange(event.target.value as "owner" | "editor" | "viewer")}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm text-foreground shadow-xs outline-none"
              >
                <option value="owner">Eigenaar</option>
                <option value="editor">Moderator</option>
                <option value="viewer">Gast</option>
              </select>
              <p className="text-xs text-muted-foreground">Eigenaar: volledige controle over sessie en leden.</p>
              <p className="text-xs text-muted-foreground">
                Moderator: gebruikers beheren, opnemen, pauzeren voor iedereen.
              </p>
              <p className="text-xs text-muted-foreground">Gast: opnemen.</p>
            </div>
          </form>
        )}
        {session.isRecording && canManageMembers && !canInviteMembers && (
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Uitnodigen is uitgeschakeld voor dit doel.
          </div>
        )}

        {!session.isRecording && (
          <form onSubmit={onJoinSubmit} className="space-y-2">
            <Label htmlFor="join-id">Deelnemen aan sessie</Label>
            <div className="flex gap-2">
              <Input
                id="join-id"
                type="text"
                placeholder="Uitnodigingscode of sessie-ID"
                value={joinId}
                onChange={(event) => onJoinIdChange(event.target.value)}
                disabled={!connected}
              />
              <Button type="submit" size="default" disabled={!connected || !joinId || isJoining}>
                {isJoining ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              </Button>
            </div>
          </form>
        )}

        {!session.isRecording && !session.isOwner && (
          <p className="text-xs text-muted-foreground">
            Start een opname of voer een uitnodigingscode/sessie-ID in om deel te nemen aan een bestaande sessie.
          </p>
        )}

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label>Actieve sessies</Label>
            <Button size="sm" variant="ghost" onClick={() => void onRefreshSessions()} disabled={!connected}>
              Vernieuwen
            </Button>
          </div>
          {activeSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nog geen actieve sessies.</p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((activeSession) => (
                <div
                  key={activeSession.sessionId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-medium">Sessie #{activeSession.sessionId}</div>
                    <div className="text-muted-foreground">
                      {activeSession.status} &bull; {formatRole(activeSession.role)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void onJoinSession(activeSession.sessionId)}
                    disabled={!connected || session.isRecording}
                  >
                    Deelnemen
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
