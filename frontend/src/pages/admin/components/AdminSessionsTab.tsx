import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { executeSessionActionApi } from "@/pages/admin/api";

interface AdminSessionsTabProps {
  token: string | null;
}

type SessionAction = "retranscribe-segments" | "retranscribe-session" | "segments" | "transcription";

export function AdminSessionsTab({ token }: AdminSessionsTabProps) {
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [sessionActionStatus, setSessionActionStatus] = useState<string | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const [isSessionActionBusy, setIsSessionActionBusy] = useState(false);

  const executeSessionAction = useCallback(
    async (action: SessionAction) => {
      if (!token) return;
      setSessionActionStatus(null);
      setSessionActionError(null);
      const sessionID = Number(sessionIdInput.trim());
      if (!Number.isFinite(sessionID) || sessionID <= 0) {
        setSessionActionError("Voer een geldig sessie-id in.");
        return;
      }
      setIsSessionActionBusy(true);
      try {
        const result = await executeSessionActionApi(token, sessionID, action);
        if (typeof result.segmentCount === "number") {
          setSessionActionStatus(`Actie uitgevoerd. Segmenten: ${result.segmentCount}.`);
        } else {
          setSessionActionStatus("Actie uitgevoerd.");
        }
      } catch (err) {
        setSessionActionError(err instanceof Error ? err.message : "Actie uitvoeren mislukt");
      } finally {
        setIsSessionActionBusy(false);
      }
    },
    [sessionIdInput, token]
  );

  return (
    <Card className="border-emerald-200/70 bg-emerald-50/20">
      <CardHeader>
        <CardTitle>Sessiebeheer</CardTitle>
        <CardDescription>
          Beheer individuele sessies: hertranscriberen, verwijderen en opschonen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-session-id">Sessie-id</Label>
          <Input
            id="admin-session-id"
            inputMode="numeric"
            placeholder="Bijv. 61"
            value={sessionIdInput}
            onChange={(event) => setSessionIdInput(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Alleen admins kunnen deze acties uitvoeren. Segmenten verwijderen past alleen de database aan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void executeSessionAction("retranscribe-segments")}
            disabled={isSessionActionBusy}
          >
            Hertranscribeer segmenten
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void executeSessionAction("retranscribe-session")}
            disabled={isSessionActionBusy}
          >
            Hertranscribeer sessie
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => void executeSessionAction("segments")}
            disabled={isSessionActionBusy}
          >
            Verwijder segmenten
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => void executeSessionAction("transcription")}
            disabled={isSessionActionBusy}
          >
            Verwijder transcript
          </Button>
        </div>

        {sessionActionStatus && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {sessionActionStatus}
          </div>
        )}
        {sessionActionError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {sessionActionError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
