import { formatRole } from "@/lib/formatters";
import type { SessionInviteNotification, SessionState } from "@/contexts/session/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InvitesCardProps {
  invites: SessionInviteNotification[];
  connected: boolean;
  session: SessionState;
  onJoinInvite: (inviteCode: string) => void | Promise<void>;
  onDeclineInvite: (sessionId: number) => void | Promise<void>;
}

export function InvitesCard({
  invites,
  connected,
  session,
  onJoinInvite,
  onDeclineInvite,
}: InvitesCardProps) {
  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessie-uitnodigingen</CardTitle>
        <CardDescription>Nieuwe uitnodigingen wachten op je</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => (
          <div
            key={`${invite.sessionId}-${invite.inviteCode}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
          >
            <div>
              <div className="font-medium">Uitgenodigd door {invite.inviterEmail}</div>
              <div className="text-muted-foreground">
                Sessie #{invite.sessionId} &bull; rol: {formatRole(invite.role)} &bull; code:{" "}
                <span className="font-mono">{invite.inviteCode}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => void onJoinInvite(invite.inviteCode)}
                disabled={!connected || session.isRecording}
              >
                Deelnemen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void onDeclineInvite(invite.sessionId)}
              >
                Afwijzen
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
