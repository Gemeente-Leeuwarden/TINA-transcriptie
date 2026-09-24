import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/useSession";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { type AudioCaptureSource } from "@/lib/audio";
import {
  isAppRecordingAllowed,
  isInviteAllowed,
} from "@/lib/purpose";
import { ConnectionStatusBar } from "@/pages/home/components/ConnectionStatusBar";
import { ErrorBanner } from "@/pages/home/components/ErrorBanner";
import { InvitesCard } from "@/pages/home/components/InvitesCard";
import { RecordingCard } from "@/pages/home/components/RecordingCard";
import { SessionActionsCard } from "@/pages/home/components/SessionActionsCard";
import { TranscriptCard } from "@/pages/home/components/TranscriptCard";
import { useExpandedTranscriptKeys } from "@/pages/home/hooks/useExpandedTranscriptKeys";
import { useHomePurposes } from "@/pages/home/hooks/useHomePurposes";
import { useRecordingPreferences } from "@/pages/home/hooks/useRecordingPreferences";

export default function Home() {
  useDocumentTitle("Home");
  const { token } = useAuth();
  const {
    connected,
    session,
    transcripts,
    currentPartial,
    hasAudioCapture,
    activeSessions,
    participants,
    invites,
    error,
    startRecording,
    stopRecording,
    startMic,
    stopMic,
    inviteUser,
    declineInvite,
    joinSession,
    leaveSession,
    refreshActiveSessions,
    clearError,
  } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const [inviteEmail, setInviteEmail] = useState("");
  const [joinId, setJoinId] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { purposes, purposeError, purposeLoading } = useHomePurposes(token);
  const [selectedPurposeId, setSelectedPurposeId] = useState<number | null>(null);

  const [inviteRole, setInviteRole] = useState<"owner" | "editor" | "viewer">("editor");

  const selectedPurpose = purposes.find((purpose) => purpose.id === selectedPurposeId) ?? null;
  const purposeForPermissions = session.isRecording ? session.purpose : selectedPurpose;
  const appRecordingAllowed = isAppRecordingAllowed(purposeForPermissions);
  const inviteAllowed = isInviteAllowed(session.purpose);
  const {
    micEnabled,
    appEnabled,
    sessionStartMs,
    nowMs,
    showReloadBanner,
    setMicEnabled,
    setAppEnabled,
  } = useRecordingPreferences({
    session: {
      isRecording: session.isRecording,
      status: session.status,
      sessionId: session.sessionId,
    },
    hasAudioCapture,
    appRecordingAllowed,
  });
  const { expandedTranscriptKeys, toggleExpandedTranscript } = useExpandedTranscriptKeys(session.sessionId);

  const effectiveAppEnabled = appRecordingAllowed ? appEnabled : false;
  const captureSource: AudioCaptureSource | null = micEnabled
    ? effectiveAppEnabled
      ? "mix"
      : "mic"
    : effectiveAppEnabled
      ? "display"
      : null;

  const micStatus = session.isMicActive ? "active" : hasAudioCapture ? "paused" : "off";
  const canManageMembers = session.role === "owner" || session.role === "editor";
  const canInviteMembers = canManageMembers && inviteAllowed;
  useEffect(() => {
    const joinParam = searchParams.get("join");
    if (!joinParam || session.isRecording || !connected) return;
    const sessionId = Number(joinParam);
    if (!Number.isFinite(sessionId) || sessionId <= 0) return;

    joinSession(sessionId).finally(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("join");
        return next;
      });
    });
  }, [searchParams, session.isRecording, connected, joinSession, setSearchParams]);

  async function handleStart() {
    setIsStarting(true);
    if (!selectedPurposeId) {
      setIsStarting(false);
      return;
    }
    await startRecording(selectedPurposeId);
    setIsStarting(false);
  }

  async function handleStop() {
    setIsStopping(true);
    await stopRecording();
    setIsStopping(false);
  }

  async function handleStartMic() {
    if (captureSource) await startMic(captureSource);
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await inviteUser(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
    } catch {
      // keep current input so users can adjust the email address
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!joinId.trim()) return;
    setIsJoining(true);
    await joinSession(joinId.trim());
    setIsJoining(false);
    setJoinId("");
  }

  return (
    <>
      <ConnectionStatusBar connected={connected} micStatus={micStatus} />

      {error && <ErrorBanner error={error} onClose={clearError} />}

      <InvitesCard
        invites={invites}
        connected={connected}
        session={session}
        onJoinInvite={joinSession}
        onDeclineInvite={declineInvite}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <RecordingCard
          connected={connected}
          session={session}
          participants={participants}
          hasAudioCapture={hasAudioCapture}
          captureSource={captureSource}
          isStarting={isStarting}
          isStopping={isStopping}
          selectedPurposeId={selectedPurposeId}
          selectedPurpose={selectedPurpose}
          purposes={purposes}
          purposeLoading={purposeLoading}
          purposeError={purposeError}
          micEnabled={micEnabled}
          appEnabled={appEnabled}
          appRecordingAllowed={appRecordingAllowed}
          sessionStartMs={sessionStartMs}
          nowMs={nowMs}
          showReloadBanner={showReloadBanner}
          onMicEnabledChange={setMicEnabled}
          onAppEnabledChange={setAppEnabled}
          onPurposeChange={setSelectedPurposeId}
          onStart={handleStart}
          onStop={handleStop}
          onStartMic={handleStartMic}
          onStopMic={stopMic}
          onLeaveSession={leaveSession}
        />

        <SessionActionsCard
          connected={connected}
          session={session}
          activeSessions={activeSessions}
          canManageMembers={canManageMembers}
          canInviteMembers={canInviteMembers}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          joinId={joinId}
          isJoining={isJoining}
          onInviteSubmit={handleInvite}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={setInviteRole}
          onJoinSubmit={handleJoin}
          onJoinIdChange={setJoinId}
          onRefreshSessions={refreshActiveSessions}
          onJoinSession={joinSession}
        />
      </div>

      <TranscriptCard
        session={session}
        transcripts={transcripts}
        currentPartial={currentPartial}
        expandedTranscriptKeys={expandedTranscriptKeys}
        onToggleExpandedTranscript={toggleExpandedTranscript}
      />
    </>
  );
}
