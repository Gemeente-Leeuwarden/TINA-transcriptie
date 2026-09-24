import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchMessageUsersApi, sendAdminNotificationApi } from "@/pages/admin/api";
import { useOnlineUsers } from "@/pages/admin/hooks/useOnlineUsers";
import type { ManagedUserItem } from "@/pages/admin/types";

interface AdminMessagesTabProps {
  token: string | null;
}

export function AdminMessagesTab({ token }: AdminMessagesTabProps) {
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgLevel, setMsgLevel] = useState<"good" | "warning" | "bad">("good");
  const [msgTarget, setMsgTarget] = useState<"all" | "specific">("all");
  const [msgSelectedUserIds, setMsgSelectedUserIds] = useState<number[]>([]);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [msgUsers, setMsgUsers] = useState<ManagedUserItem[]>([]);
  const [msgUserPage, setMsgUserPage] = useState(1);
  const [msgUserTotalPages, setMsgUserTotalPages] = useState(0);
  const [isMsgUsersLoading, setIsMsgUsersLoading] = useState(false);
  const [isMsgSending, setIsMsgSending] = useState(false);
  const [msgStatus, setMsgStatus] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);

  const onlineUserIds = useOnlineUsers(token, true);

  const fetchMsgUsers = useCallback(
    async (page: number, search: string) => {
      if (!token) return;
      setIsMsgUsersLoading(true);
      try {
        const data = await fetchMessageUsersApi(token, page, search);
        setMsgUsers(data.users);
        setMsgUserTotalPages(data.totalPages);
      } catch {
        setMsgUsers([]);
      } finally {
        setIsMsgUsersLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (msgTarget !== "specific") return;
    void fetchMsgUsers(msgUserPage, msgSearchQuery);
  }, [fetchMsgUsers, msgSearchQuery, msgTarget, msgUserPage]);

  const sendAdminMessage = useCallback(async () => {
    if (!token) return;
    setMsgStatus(null);
    setMsgError(null);

    if (!msgTitle.trim() || !msgBody.trim()) {
      setMsgError("Titel en bericht zijn verplicht.");
      return;
    }
    if (msgTarget === "specific" && msgSelectedUserIds.length === 0) {
      setMsgError("Selecteer minstens een gebruiker.");
      return;
    }

    setIsMsgSending(true);
    try {
      const recipients = await sendAdminNotificationApi(token, {
        title: msgTitle.trim(),
        message: msgBody.trim(),
        level: msgLevel,
        user_ids: msgTarget === "specific" ? msgSelectedUserIds : [],
      });
      setMsgStatus(`Bericht verstuurd naar ${recipients} gebruiker(s).`);
      setMsgTitle("");
      setMsgBody("");
      setMsgSelectedUserIds([]);
    } catch (err) {
      setMsgError(err instanceof Error ? err.message : "Bericht versturen mislukt");
    } finally {
      setIsMsgSending(false);
    }
  }, [msgBody, msgLevel, msgSelectedUserIds, msgTarget, msgTitle, token]);

  return (
    <Card className="border-amber-200/70 bg-amber-50/20">
      <CardHeader>
        <CardTitle>Berichten versturen</CardTitle>
        <CardDescription>
          Stuur een real-time notificatie naar alle of specifieke gebruikers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="msg-title">Titel</Label>
          <Input
            id="msg-title"
            placeholder="Titel van het bericht"
            value={msgTitle}
            onChange={(event) => setMsgTitle(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="msg-body">Bericht</Label>
          <Textarea
            id="msg-body"
            placeholder="Inhoud van het bericht"
            rows={3}
            value={msgBody}
            onChange={(event) => setMsgBody(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Level</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={msgLevel === "good" ? "secondary" : "ghost"}
              className={
                msgLevel === "good"
                  ? "border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : ""
              }
              onClick={() => setMsgLevel("good")}
            >
              Goed
            </Button>
            <Button
              type="button"
              size="sm"
              variant={msgLevel === "warning" ? "secondary" : "ghost"}
              className={
                msgLevel === "warning"
                  ? "border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                  : ""
              }
              onClick={() => setMsgLevel("warning")}
            >
              Waarschuwing
            </Button>
            <Button
              type="button"
              size="sm"
              variant={msgLevel === "bad" ? "secondary" : "ghost"}
              className={
                msgLevel === "bad"
                  ? "border border-red-300 bg-red-100 text-red-800 hover:bg-red-200"
                  : ""
              }
              onClick={() => setMsgLevel("bad")}
            >
              Fout
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Doelgroep</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={msgTarget === "all" ? "secondary" : "ghost"}
              onClick={() => setMsgTarget("all")}
            >
              Alle gebruikers
            </Button>
            <Button
              type="button"
              size="sm"
              variant={msgTarget === "specific" ? "secondary" : "ghost"}
              onClick={() => setMsgTarget("specific")}
            >
              Specifieke gebruikers
            </Button>
          </div>
        </div>

        {msgTarget === "specific" && (
          <div className="space-y-2">
            <Label htmlFor="msg-user-search">Gebruikers selecteren</Label>
            <Input
              id="msg-user-search"
              placeholder="Zoek op e-mail..."
              value={msgSearchQuery}
              onChange={(event) => {
                setMsgSearchQuery(event.target.value);
                setMsgUserPage(1);
              }}
            />
            {isMsgUsersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Gebruikers laden...
              </div>
            ) : msgUsers.length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                Geen gebruikers gevonden.
              </div>
            ) : (
              <>
                <div className="space-y-1 rounded-md border p-2">
                  {msgUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={msgSelectedUserIds.includes(user.id)}
                        onChange={() =>
                          setMsgSelectedUserIds((prev) =>
                            prev.includes(user.id)
                              ? prev.filter((id) => id !== user.id)
                              : [...prev, user.id]
                          )
                        }
                      />
                      <span
                        className={`inline-block size-2 rounded-full ${
                          onlineUserIds.has(user.id) ? "bg-emerald-500" : "bg-muted-foreground/30"
                        }`}
                      />
                      {user.email}
                    </label>
                  ))}
                </div>
                {msgUserTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={msgUserPage <= 1 || isMsgUsersLoading}
                      onClick={() => setMsgUserPage((prev) => Math.max(1, prev - 1))}
                    >
                      Vorige
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Pagina {msgUserPage} van {msgUserTotalPages}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={msgUserPage >= msgUserTotalPages || isMsgUsersLoading}
                      onClick={() => setMsgUserPage((prev) => prev + 1)}
                    >
                      Volgende
                    </Button>
                  </div>
                )}
              </>
            )}
            {msgSelectedUserIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {msgSelectedUserIds.length} gebruiker(s) geselecteerd
              </p>
            )}
          </div>
        )}

        <Button type="button" onClick={() => void sendAdminMessage()} disabled={isMsgSending}>
          {isMsgSending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Versturen...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Verstuur bericht
            </>
          )}
        </Button>

        {msgStatus && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {msgStatus}
          </div>
        )}
        {msgError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {msgError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
