import { Loader2, LogOut, Mic, MicOff } from "lucide-react";
import type { AudioCaptureSource } from "@/lib/audio";
import { formatRole, formatTimestamp } from "@/lib/formatters";
import type { ParticipantInfo, SessionState } from "@/contexts/session/types";
import type { PurposeSummary } from "@/lib/purpose";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface RecordingCardProps {
  connected: boolean;
  session: SessionState;
  participants: ParticipantInfo[];
  hasAudioCapture: boolean;
  captureSource: AudioCaptureSource | null;
  isStarting: boolean;
  isStopping: boolean;
  selectedPurposeId: number | null;
  selectedPurpose: PurposeSummary | null;
  purposes: PurposeSummary[];
  purposeLoading: boolean;
  purposeError: string | null;
  micEnabled: boolean;
  appEnabled: boolean;
  appRecordingAllowed: boolean;
  sessionStartMs: number | null;
  nowMs: number;
  showReloadBanner: boolean;
  onMicEnabledChange: (value: boolean) => void;
  onAppEnabledChange: (value: boolean) => void;
  onPurposeChange: (value: number | null) => void;
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onStartMic: () => void | Promise<void>;
  onStopMic: () => void;
  onLeaveSession: () => void | Promise<void>;
}

export function RecordingCard({
  connected,
  session,
  participants,
  hasAudioCapture,
  captureSource,
  isStarting,
  isStopping,
  selectedPurposeId,
  selectedPurpose,
  purposes,
  purposeLoading,
  purposeError,
  micEnabled,
  appEnabled,
  appRecordingAllowed,
  sessionStartMs,
  nowMs,
  showReloadBanner,
  onMicEnabledChange,
  onAppEnabledChange,
  onPurposeChange,
  onStart,
  onStop,
  onStartMic,
  onStopMic,
  onLeaveSession,
}: RecordingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opname</CardTitle>
        <CardDescription>
          {session.isRecording
            ? `Sessie #${session.sessionId} ${session.isOwner ? "(eigenaar)" : "(deelnemer)"}`
            : "Nieuwe sessie aanmaken"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!session.isRecording ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-3 transition-all duration-300 ease-out">
              <div className="text-sm font-medium">Stap 1: Selecteer bronnen</div>
              <p className="text-xs text-muted-foreground">
                Kies de audiobronnen voordat je de sessie start.
              </p>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="audio-mic" className="text-xs">
                    Microfoon
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="audio-mic"
                      type="checkbox"
                      checked={micEnabled}
                      onChange={(event) => onMicEnabledChange(event.target.checked)}
                      disabled={hasAudioCapture || isStarting || isStopping}
                      className="size-4 accent-foreground"
                    />
                    <span className="text-sm">Microfoon gebruiken</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audio-app" className="text-xs">
                    App (tab-audio)
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="audio-app"
                      type="checkbox"
                      checked={appEnabled}
                      onChange={(event) => onAppEnabledChange(event.target.checked)}
                      disabled={hasAudioCapture || isStarting || isStopping || !appRecordingAllowed}
                      className="size-4 accent-foreground"
                    />
                    <span className="text-sm">Gedeelde tab-audio gebruiken</span>
                  </div>
                  {!appRecordingAllowed && (
                    <p className="text-xs text-muted-foreground">
                      App-opname is niet toegestaan voor dit doel.
                    </p>
                  )}
                </div>
                {!captureSource && (
                  <p className="text-xs text-muted-foreground">
                    Kies minstens een audiobron voordat je start.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 transition-all duration-300 ease-out">
              <div className="text-sm font-medium">Stap 2: Kies doel</div>
              <p className="text-xs text-muted-foreground">
                Selecteer het doel voordat je de sessie start.
              </p>
              <div className="mt-3 space-y-2">
                <select
                  value={selectedPurposeId ?? ""}
                  onChange={(event) => onPurposeChange(event.target.value ? Number(event.target.value) : null)}
                  disabled={purposeLoading || isStarting || isStopping}
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
            </div>

            <div
              className={`rounded-md border bg-muted/20 p-3 transition-all duration-300 ease-out ${
                captureSource
                  ? "opacity-100 translate-y-0 max-h-[300px]"
                  : "opacity-0 -translate-y-1 max-h-0 overflow-hidden pointer-events-none"
              }`}
            >
              <div className="text-sm font-medium">Stap 3: Start sessie</div>
              <p className="text-xs text-muted-foreground">
                We maken de sessie aan en tonen daarna de bediening.
              </p>
              <Button
                className="mt-3 w-full"
                onClick={() => void onStart()}
                disabled={!connected || isStarting || !captureSource || !selectedPurposeId}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Bezig met aanmaken...
                  </>
                ) : (
                  <>
                    <Mic className="size-4" />
                    Sessie starten
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {!showReloadBanner && (
                <Button
                  variant={session.isMicActive ? "secondary" : "default"}
                  className="w-full"
                  onClick={session.isMicActive ? onStopMic : () => void onStartMic()}
                  disabled={!connected || !captureSource}
                >
                  {session.isMicActive ? (
                    <>
                      <MicOff className="size-4" />
                      {session.isOwner ? "Opname pauzeren" : "Microfoon stoppen"}
                    </>
                  ) : (
                    <>
                      <Mic className="size-4" />
                      {hasAudioCapture
                        ? session.isOwner ? "Opname hervatten" : "Microfoon hervatten"
                        : session.isOwner && session.status !== "recording"
                          ? "Opname starten"
                          : "Microfoon starten"}
                    </>
                  )}
                </Button>
              )}
            </div>

            {session.isOwner && session.isRecording && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => void onStop()}
                disabled={isStopping}
              >
                {isStopping ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Bezig met beeindigen...
                  </>
                ) : (
                  <>
                    <MicOff className="size-4" />
                    Sessie beeindigen
                  </>
                )}
              </Button>
            )}
            {!session.isOwner && session.isRecording && (
              <Button variant="outline" className="w-full" onClick={() => void onLeaveSession()}>
                <LogOut className="size-4" />
                Sessie verlaten
              </Button>
            )}

            {session.isRecording && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground transition-all duration-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </span>
                {session.isOwner
                  ? session.isMicActive
                    ? "Opname bezig"
                    : "Sessie actief (gepauzeerd)"
                  : session.isMicActive
                    ? "Microfoon is actief"
                    : "Verbonden met sessie"}
                {sessionStartMs != null && (
                  <span className="font-mono text-xs text-slate-500">
                    {formatTimestamp(nowMs - sessionStartMs)}
                  </span>
                )}
              </div>
            )}

            {showReloadBanner && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 shadow-sm">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  App opnieuw selecteren
                </div>
                Je tab-audio is niet actief na verversen. Kies je app opnieuw en start de opname.
                {micEnabled && (
                  <div className="mt-2">We vragen ook opnieuw om toegang tot je microfoon.</div>
                )}
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => void onStartMic()}
                    disabled={!captureSource}
                  >
                    App opnieuw selecteren
                  </Button>
                </div>
              </div>
            )}

            {session.isRecording && session.isOwner && session.inviteCode && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs transition-all duration-300">
                Uitnodigingscode: <span className="font-mono font-semibold">{session.inviteCode}</span>
              </div>
            )}

            {session.isRecording && (
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs space-y-2 transition-all duration-300">
                <div className="font-medium">Actieve deelnemers</div>
                {participants.length === 0 ? (
                  <div className="text-muted-foreground">Nog geen actieve deelnemers.</div>
                ) : (
                  <div className="space-y-1">
                    {participants.map((participant) => (
                      <div
                        key={participant.userId}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="text-muted-foreground">{participant.email}</span>
                        <span>{formatRole(participant.role)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
