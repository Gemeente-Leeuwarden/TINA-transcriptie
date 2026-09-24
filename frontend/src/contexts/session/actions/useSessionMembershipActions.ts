import { useCallback } from "react";
import {
  rpc,
  unsubscribeFromSession,
} from "@/lib/centrifuge";
import { IDLE_SESSION, IDLE_UPLOAD } from "@/contexts/session/types";
import type { SessionActionsSharedParams, SessionMembershipActions } from "@/contexts/session/actions/types";

type UseSessionMembershipActionsParams = Pick<
  SessionActionsSharedParams,
  | "captureRef"
  | "subRef"
  | "sessionIdRef"
  | "setError"
  | "dismissInvite"
  | "fetchActiveSessions"
  | "clearParticipantRefs"
  | "resetSegmentState"
  | "setUploadStatus"
  | "setSession"
  | "markSessionEnded"
  | "setHasAudioCapture"
>;

export function useSessionMembershipActions({
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
}: UseSessionMembershipActionsParams): SessionMembershipActions {
  const inviteUser = useCallback(
    async (email: string, role: "owner" | "editor" | "viewer" = "editor") => {
      try {
        setError(null);
        const payload: Record<string, unknown> = { email, role };
        if (sessionIdRef.current) {
          payload.session_id = sessionIdRef.current;
        }
        await rpc("session_invite", payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gebruiker uitnodigen mislukt";
        setError(message);
        throw new Error(message);
      }
    },
    [sessionIdRef, setError]
  );

  const declineInvite = useCallback(
    async (sessionId: number) => {
      try {
        setError(null);
        await rpc("session_invite_decline", { session_id: sessionId });
        dismissInvite(sessionId);
        fetchActiveSessions().catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Uitnodiging afwijzen mislukt");
      }
    },
    [dismissInvite, fetchActiveSessions, setError]
  );

  const leaveSession = useCallback(async () => {
    try {
      setError(null);
      const leftSessionId = sessionIdRef.current;

      captureRef.current?.stop();
      captureRef.current = null;
      setHasAudioCapture(false);
      resetSegmentState();

      if (leftSessionId) {
        unsubscribeFromSession(leftSessionId);
      }
      subRef.current = null;
      clearParticipantRefs();
      setUploadStatus(IDLE_UPLOAD);

      await rpc("session_leave");
      setSession(IDLE_SESSION);
      markSessionEnded(leftSessionId);
      fetchActiveSessions().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sessie verlaten mislukt");
    }
  }, [
    captureRef,
    clearParticipantRefs,
    fetchActiveSessions,
    markSessionEnded,
    resetSegmentState,
    sessionIdRef,
    setError,
    setHasAudioCapture,
    setSession,
    setUploadStatus,
    subRef,
  ]);

  return {
    inviteUser,
    declineInvite,
    leaveSession,
  };
}
