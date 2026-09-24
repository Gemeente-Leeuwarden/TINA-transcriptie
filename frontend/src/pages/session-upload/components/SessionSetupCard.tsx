import { Loader2, UploadCloud } from "lucide-react";
import type { PurposeSummary } from "@/lib/purpose";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface SessionSetupCardProps {
  sessionId: number | null;
  inviteCode: string | null;
  status: string | null;
  purposes: PurposeSummary[];
  selectedPurposeId: number | null;
  selectedPurpose: PurposeSummary | null;
  purposeLoading: boolean;
  purposeError: string | null;
  isCreating: boolean;
  sessionPurpose: PurposeSummary | null;
  onPurposeChange: (purposeID: number | null) => void;
  onCreateSession: () => void;
}

export function SessionSetupCard({
  sessionId,
  inviteCode,
  status,
  purposes,
  selectedPurposeId,
  selectedPurpose,
  purposeLoading,
  purposeError,
  isCreating,
  sessionPurpose,
  onPurposeChange,
  onCreateSession,
}: SessionSetupCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe uploadsessie</CardTitle>
        <CardDescription>Maak een sessie aan en upload je audio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sessionId ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="upload-purpose">Doel</Label>
              <select
                id="upload-purpose"
                value={selectedPurposeId ?? ""}
                onChange={(event) =>
                  onPurposeChange(event.target.value ? Number(event.target.value) : null)
                }
                disabled={purposeLoading || isCreating}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm text-foreground shadow-xs outline-none"
              >
                <option value="">Kies doel</option>
                {purposes.map((purpose) => (
                  <option key={purpose.id} value={purpose.id}>
                    {purpose.title}
                  </option>
                ))}
              </select>
              {purposeLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Doelen laden...
                </div>
              )}
              {purposeError && <p className="text-xs text-destructive">{purposeError}</p>}
              {selectedPurpose?.description && (
                <p className="text-xs text-muted-foreground">{selectedPurpose.description}</p>
              )}
              {!purposeLoading && purposes.length === 0 && !purposeError && (
                <p className="text-xs text-muted-foreground">Geen doelen beschikbaar.</p>
              )}
            </div>
            <Button className="w-full" onClick={onCreateSession} disabled={isCreating || !selectedPurposeId}>
              {isCreating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sessie aanmaken...
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" />
                  Uploadsessie starten
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <div>Sessie #{sessionId}</div>
              {status && <div className="text-muted-foreground">Status: {status}</div>}
              {sessionPurpose && (
                <div className="text-muted-foreground">Doel: {sessionPurpose.title}</div>
              )}
            </div>
            {inviteCode && (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                Uitnodigingscode: <span className="font-mono font-semibold">{inviteCode}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
