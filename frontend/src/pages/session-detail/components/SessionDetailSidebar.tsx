import { type FormEvent } from "react";
import { Check, Download, Loader2, Trash2, UserPlus } from "lucide-react";
import { formatDate, formatRole, formatStatus } from "@/lib/formatters";
import type { PromptOption, SessionDetail, SessionMember } from "@/pages/session-detail/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SessionDetailSidebarProps {
  detail: SessionDetail | null;
  sessionId: number;
  isLoading: boolean;
  error: string | null;
  hasStructuredLines: boolean;
  canManageMembers: boolean;
  canInviteMembers: boolean;
  inviteEmail: string;
  inviteRole: "owner" | "editor" | "viewer";
  isInviting: boolean;
  membersError: string | null;
  isMembersLoading: boolean;
  sortedMembers: SessionMember[];
  removeBusy: number | null;
  isSessionFinished: boolean;
  canApplyPrompts: boolean;
  selectedPromptId: number | "";
  promptOptions: PromptOption[];
  isPromptOptionsLoading: boolean;
  promptOptionsError: string | null;
  isApplyingPrompt: boolean;
  applyPromptError: string | null;
  applyPromptNotice: string | null;
  onDownload: () => void;
  onInviteSubmit: (event: FormEvent) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: "owner" | "editor" | "viewer") => void;
  onRemoveMember: (userID: number) => void;
  onApplyPromptSubmit: (event: FormEvent) => void;
  onSelectedPromptChange: (value: number | "") => void;
}

export function SessionDetailSidebar({
  detail,
  sessionId,
  isLoading,
  error,
  hasStructuredLines,
  canManageMembers,
  canInviteMembers,
  inviteEmail,
  inviteRole,
  isInviting,
  membersError,
  isMembersLoading,
  sortedMembers,
  removeBusy,
  isSessionFinished,
  canApplyPrompts,
  selectedPromptId,
  promptOptions,
  isPromptOptionsLoading,
  promptOptionsError,
  isApplyingPrompt,
  applyPromptError,
  applyPromptNotice,
  onDownload,
  onInviteSubmit,
  onInviteEmailChange,
  onInviteRoleChange,
  onRemoveMember,
  onApplyPromptSubmit,
  onSelectedPromptChange,
}: SessionDetailSidebarProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Sessie #{detail?.sessionId ?? sessionId}</CardTitle>
          <CardDescription>Lees de transcriptie en beheer toegang</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Bezig met laden...
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : detail ? (
            <>
              <div className="grid gap-2 text-xs md:grid-cols-2">
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onDownload}
                  disabled={!detail.transcription && !hasStructuredLines}
                >
                  <Download className="size-4" />
                  Download transcript
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Deelnemers</CardTitle>
          <CardDescription>Wie toegang heeft tot deze sessie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {canInviteMembers && (
            <form onSubmit={onInviteSubmit} className="space-y-2">
              <Label htmlFor="invite-email">Nieuwe deelnemer</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="collega@example.com"
                  value={inviteEmail}
                  onChange={(event) => onInviteEmailChange(event.target.value)}
                />
                <select
                  value={inviteRole}
                  onChange={(event) =>
                    onInviteRoleChange(event.target.value as "owner" | "editor" | "viewer")
                  }
                  className="h-9 rounded-md border bg-transparent px-3 text-sm text-foreground shadow-xs outline-none"
                >
                  <option value="owner">Eigenaar</option>
                  <option value="editor">Moderator</option>
                  <option value="viewer">Gast</option>
                </select>
                <Button type="submit" size="sm" disabled={!inviteEmail || isInviting}>
                  {isInviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  Uitnodigen
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Uitnodigen geeft toegang tot de transcriptie.</p>
            </form>
          )}
          {canManageMembers && !canInviteMembers && (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Uitnodigen is uitgeschakeld voor dit doel.
            </div>
          )}
          {membersError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {membersError}
            </div>
          )}
          {isMembersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Leden laden...
            </div>
          ) : sortedMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen deelnemers.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {sortedMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div>
                    <div className="font-medium">{member.email}</div>
                    <div className="text-xs text-muted-foreground">{formatRole(member.role)}</div>
                  </div>
                  {canManageMembers && member.role !== "owner" && (
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
                      Verwijderen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Nieuwe prompt</CardTitle>
          <CardDescription>Voeg extra analyses toe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!isSessionFinished && (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Promptresultaten verschijnen zodra de transcriptie klaar is.
            </div>
          )}
          {isSessionFinished && canApplyPrompts && (
            <form onSubmit={onApplyPromptSubmit} className="space-y-2">
              <Label htmlFor="prompt-select">Nieuwe prompt</Label>
              <div className="flex flex-wrap gap-2">
                <select
                  id="prompt-select"
                  value={selectedPromptId}
                  onChange={(event) =>
                    onSelectedPromptChange(event.target.value ? Number(event.target.value) : "")
                  }
                  className="h-9 rounded-md border bg-transparent px-3 text-sm text-foreground shadow-xs outline-none"
                  disabled={isPromptOptionsLoading || promptOptions.length === 0}
                >
                  <option value="">Kies prompt</option>
                  {promptOptions.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.title}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" disabled={isApplyingPrompt || !selectedPromptId}>
                  {isApplyingPrompt ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Prompt uitvoeren
                </Button>
              </div>
              {isPromptOptionsLoading ? (
                <div className="text-xs text-muted-foreground">Prompts laden...</div>
              ) : promptOptions.length === 0 ? (
                <div className="text-xs text-muted-foreground">Geen prompts beschikbaar.</div>
              ) : (
                <p className="text-xs text-muted-foreground">Voeg extra analyses toe aan de transcriptie.</p>
              )}
            </form>
          )}
          {isSessionFinished && !canApplyPrompts && (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Alleen eigenaar of moderator kan prompts toevoegen.
            </div>
          )}
          {promptOptionsError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {promptOptionsError}
            </div>
          )}
          {applyPromptError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {applyPromptError}
            </div>
          )}
          {applyPromptNotice && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {applyPromptNotice}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
