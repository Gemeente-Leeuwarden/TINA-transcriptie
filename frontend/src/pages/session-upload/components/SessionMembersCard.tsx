import { type FormEvent } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { formatRole } from "@/lib/formatters";
import type { SessionMember } from "@/pages/session-upload/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface SessionMembersCardProps {
  sessionId: number | null;
  inviteAllowed: boolean;
  inviteEmail: string;
  inviteRole: "owner" | "editor" | "viewer";
  isInviting: boolean;
  membersError: string | null;
  isMembersLoading: boolean;
  members: SessionMember[];
  sortedMembers: SessionMember[];
  removeBusy: number | null;
  onInviteSubmit: (event: FormEvent) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: "owner" | "editor" | "viewer") => void;
  onRemoveMember: (userID: number) => void;
}

export function SessionMembersCard({
  sessionId,
  inviteAllowed,
  inviteEmail,
  inviteRole,
  isInviting,
  membersError,
  isMembersLoading,
  members,
  sortedMembers,
  removeBusy,
  onInviteSubmit,
  onInviteEmailChange,
  onInviteRoleChange,
  onRemoveMember,
}: SessionMembersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deelnemers</CardTitle>
        <CardDescription>Beheer wie toegang heeft tot deze sessie.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sessionId ? (
          <p className="text-xs text-muted-foreground">
            Maak eerst een sessie aan om deelnemers toe te voegen.
          </p>
        ) : (
          <>
            {inviteAllowed ? (
              <form onSubmit={onInviteSubmit} className="space-y-2">
                <Label htmlFor="upload-invite-email">Uitnodigen per e-mail</Label>
                <div className="flex gap-2">
                  <Input
                    id="upload-invite-email"
                    type="email"
                    placeholder="collega@example.com"
                    value={inviteEmail}
                    onChange={(event) => onInviteEmailChange(event.target.value)}
                  />
                  <Button type="submit" size="default" disabled={isInviting}>
                    {isInviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-invite-role">Rol</Label>
                  <select
                    id="upload-invite-role"
                    value={inviteRole}
                    onChange={(event) => onInviteRoleChange(event.target.value as "owner" | "editor" | "viewer")}
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm text-foreground shadow-xs outline-none"
                  >
                    <option value="owner">Eigenaar</option>
                    <option value="editor">Moderator</option>
                    <option value="viewer">Gast</option>
                  </select>
                </div>
              </form>
            ) : (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Uitnodigen is uitgeschakeld voor dit doel.
              </div>
            )}

            <Separator />

            {membersError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {membersError}
              </div>
            )}
            {isMembersLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Leden laden...
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nog geen deelnemers.</p>
            ) : (
              <div className="space-y-2">
                {sortedMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-medium">{member.email}</div>
                      <div className="text-muted-foreground">{formatRole(member.role)}</div>
                    </div>
                    {member.role !== "owner" && (
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
