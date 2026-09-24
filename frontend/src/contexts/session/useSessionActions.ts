import type { AudioCaptureSource } from "@/lib/audio";
import type { SessionActionsSharedParams } from "@/contexts/session/actions/types";
import { useSessionRecordingActions } from "@/contexts/session/actions/useSessionRecordingActions";
import { useSessionMembershipActions } from "@/contexts/session/actions/useSessionMembershipActions";
import { useJoinSessionAction } from "@/contexts/session/actions/useJoinSessionAction";
import { useAutoJoinOwnerSession } from "@/contexts/session/actions/useAutoJoinOwnerSession";

export function useSessionActions({
  token,
  connected,
  session,
  activeSessions,
  sessionIdRef,
  captureRef,
  subRef,
  segmentBufferRef,
  segmentBytesRef,
  segmentStartMsRef,
  segmentTimerRef,
  endedSessionsRef,
  autoJoinAttemptedRef,
  transcriptBaseMsRef,
  flushSegment,
  resetSegmentState,
  clearParticipantRefs,
  fetchActiveSessions,
  markSessionEnded,
  dismissInvite,
  setError,
  setSession,
  setTranscripts,
  setCurrentPartial,
  setHasAudioCapture,
  setUploadStatus,
  handlePublication,
}: SessionActionsSharedParams): {
  startRecording: (purposeId: number) => Promise<void>;
  stopRecording: () => Promise<void>;
  startMic: (source?: AudioCaptureSource) => Promise<void>;
  stopMic: () => void;
  inviteUser: (email: string, role?: "owner" | "editor" | "viewer") => Promise<void>;
  declineInvite: (sessionId: number) => Promise<void>;
  joinSession: (sessionIdOrCode: string | number) => Promise<void>;
  leaveSession: () => Promise<void>;
} {
  const recordingActions = useSessionRecordingActions({
    token,
    session,
    sessionIdRef,
    captureRef,
    subRef,
    segmentBufferRef,
    segmentBytesRef,
    segmentStartMsRef,
    segmentTimerRef,
    endedSessionsRef,
    flushSegment,
    resetSegmentState,
    clearParticipantRefs,
    fetchActiveSessions,
    markSessionEnded,
    setError,
    setSession,
    setTranscripts,
    setCurrentPartial,
    setHasAudioCapture,
    setUploadStatus,
    handlePublication,
  });

  const membershipActions = useSessionMembershipActions({
    captureRef,
    subRef,
    sessionIdRef,
    setError,
    dismissInvite,
    fetchActiveSessions,
    clearParticipantRefs,
    resetSegmentState,
    setUploadStatus,
    setSession,
    markSessionEnded,
    setHasAudioCapture,
  });

  const joinSession = useJoinSessionAction({
    token,
    activeSessions,
    endedSessionsRef,
    captureRef,
    subRef,
    transcriptBaseMsRef,
    setSession,
    setTranscripts,
    setCurrentPartial,
    setUploadStatus,
    setHasAudioCapture,
    setError,
    clearParticipantRefs,
    dismissInvite,
    fetchActiveSessions,
    resetSegmentState,
    handlePublication,
  });

  useAutoJoinOwnerSession({
    connected,
    session,
    activeSessions,
    autoJoinAttemptedRef,
    joinSession,
  });

  return {
    ...recordingActions,
    inviteUser: membershipActions.inviteUser,
    declineInvite: membershipActions.declineInvite,
    joinSession,
    leaveSession: membershipActions.leaveSession,
  };
}
