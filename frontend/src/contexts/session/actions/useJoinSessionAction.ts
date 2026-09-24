import { useCallback } from "react";
import {
  rpc,
  subscribeToSession,
} from "@/lib/centrifuge";
import { mapPurpose, type PurposeApi } from "@/lib/purpose";
import { IDLE_UPLOAD } from "@/contexts/session/types";
import type { SessionActionsSharedParams } from "@/contexts/session/actions/types";
import { hydrateSessionTranscripts } from "@/contexts/session/actions/hydrateSessionTranscripts";

type UseJoinSessionActionParams = Pick<
  SessionActionsSharedParams,
  | "token"
  | "activeSessions"
  | "endedSessionsRef"
  | "captureRef"
  | "subRef"
  | "transcriptBaseMsRef"
  | "setSession"
  | "setTranscripts"
  | "setCurrentPartial"
  | "setUploadStatus"
  | "setHasAudioCapture"
  | "setError"
  | "clearParticipantRefs"
  | "dismissInvite"
  | "fetchActiveSessions"
  | "resetSegmentState"
  | "handlePublication"
>;

export function useJoinSessionAction({
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
}: UseJoinSessionActionParams): (sessionIdOrCode: string | number) => Promise<void> {
  return useCallback(
    async (sessionIdOrCode: string | number) => {
      try {
        setError(null);
        const payload: Record<string, unknown> = {};
        let resolvedSessionId: number | null = null;

        if (typeof sessionIdOrCode === "number") {
          payload.session_id = sessionIdOrCode;
          resolvedSessionId = sessionIdOrCode;
        } else {
          const trimmed = sessionIdOrCode.trim();
          if (/^\d+$/.test(trimmed)) {
            const numeric = parseInt(trimmed, 10);
            payload.session_id = numeric;
            resolvedSessionId = numeric;
          } else {
            payload.invite_code = trimmed;
          }
        }

        const summary = resolvedSessionId
          ? activeSessions.find((activeSession) => activeSession.sessionId === resolvedSessionId)
          : null;

        const loadSegments = async (sid: number) => {
          try {
            await hydrateSessionTranscripts({
              token,
              sessionId: sid,
              transcriptBaseMsRef,
              setTranscripts,
            });
          } catch {
            // best-effort hydration from existing segments only
          }
        };

        if (summary?.role === "owner" && summary.status === "new" && resolvedSessionId) {
          endedSessionsRef.current.delete(resolvedSessionId);
          setSession({
            sessionId: resolvedSessionId,
            isOwner: true,
            isRecording: true,
            inviteCode: summary.inviteCode ?? null,
            isMicActive: false,
            status: summary.status,
            role: "owner",
            purpose: summary.purpose ?? null,
          });

          if (subRef.current == null) {
            subRef.current = subscribeToSession(resolvedSessionId, handlePublication);
          }

          setTranscripts([]);
          setCurrentPartial(null);
          clearParticipantRefs();
          setUploadStatus(IDLE_UPLOAD);
          captureRef.current?.stop();
          captureRef.current = null;
          setHasAudioCapture(false);
          dismissInvite(resolvedSessionId);
          fetchActiveSessions().catch(() => {});
          loadSegments(resolvedSessionId).catch(() => {});
          return;
        }

        const res = await rpc<{ session_id: number; role?: string; status?: string; purpose?: PurposeApi }>(
          "session_join",
          payload
        );

        const sid = res.session_id;
        endedSessionsRef.current.delete(sid);
        const role = (res.role ?? "editor") as "owner" | "editor" | "viewer";
        const status = res.status ?? summary?.status ?? "recording";
        const purpose = res.purpose ? mapPurpose(res.purpose) : summary?.purpose ?? null;

        setSession({
          sessionId: sid,
          isOwner: role === "owner",
          isRecording: true,
          inviteCode: null,
          isMicActive: false,
          status,
          role,
          purpose,
        });

        setTranscripts([]);
        setCurrentPartial(null);
        subRef.current = subscribeToSession(sid, handlePublication);
        clearParticipantRefs();
        setUploadStatus(IDLE_UPLOAD);
        captureRef.current?.stop();
        captureRef.current = null;
        setHasAudioCapture(false);
        resetSegmentState();
        dismissInvite(sid);
        fetchActiveSessions().catch(() => {});
        loadSegments(sid).catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Deelnemen aan sessie mislukt");
      }
    },
    [
      activeSessions,
      captureRef,
      clearParticipantRefs,
      dismissInvite,
      endedSessionsRef,
      fetchActiveSessions,
      handlePublication,
      resetSegmentState,
      setCurrentPartial,
      setError,
      setHasAudioCapture,
      setSession,
      setTranscripts,
      setUploadStatus,
      subRef,
      token,
      transcriptBaseMsRef,
    ]
  );
}
