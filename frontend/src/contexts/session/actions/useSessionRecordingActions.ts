import { useCallback } from "react";
import {
  rpc,
  subscribeToSession,
  unsubscribeFromSession,
} from "@/lib/centrifuge";
import type { AudioCaptureSource } from "@/lib/audio";
import { startAudioCapture } from "@/lib/audio";
import { mapPurpose, type PurposeApi } from "@/lib/purpose";
import {
  IDLE_SESSION,
  IDLE_UPLOAD,
} from "@/contexts/session/types";
import type { SessionActionsSharedParams, SessionRecordingActions } from "@/contexts/session/actions/types";

type UseSessionRecordingActionsParams = Pick<
  SessionActionsSharedParams,
  | "token"
  | "session"
  | "sessionIdRef"
  | "captureRef"
  | "subRef"
  | "segmentBufferRef"
  | "segmentBytesRef"
  | "segmentStartMsRef"
  | "segmentTimerRef"
  | "endedSessionsRef"
  | "flushSegment"
  | "resetSegmentState"
  | "clearParticipantRefs"
  | "fetchActiveSessions"
  | "markSessionEnded"
  | "setError"
  | "setSession"
  | "setTranscripts"
  | "setCurrentPartial"
  | "setHasAudioCapture"
  | "setUploadStatus"
  | "handlePublication"
>;

export function useSessionRecordingActions({
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
}: UseSessionRecordingActionsParams): SessionRecordingActions {
  const startRecording = useCallback(
    async (purposeId: number) => {
      try {
        setError(null);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ purpose_id: purposeId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Sessie aanmaken mislukt");
        }

        const data = (await res.json()) as {
          session_id: number;
          invite_code: string;
          purpose?: PurposeApi;
        };
        const sid = data.session_id;
        endedSessionsRef.current.delete(sid);
        const purpose = data.purpose ? mapPurpose(data.purpose) : null;

        if (subRef.current == null) {
          subRef.current = subscribeToSession(sid, handlePublication);
        }
        setSession({
          sessionId: sid,
          isOwner: true,
          isRecording: true,
          inviteCode: data.invite_code ?? null,
          isMicActive: false,
          status: "new",
          role: "owner",
          purpose,
        });
        clearParticipantRefs();
        setUploadStatus(IDLE_UPLOAD);
        setTranscripts([]);
        setCurrentPartial(null);
        fetchActiveSessions().catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sessie aanmaken mislukt");
      }
    },
    [
      clearParticipantRefs,
      endedSessionsRef,
      fetchActiveSessions,
      handlePublication,
      setCurrentPartial,
      setError,
      setSession,
      setTranscripts,
      setUploadStatus,
      subRef,
      token,
    ]
  );

  const stopRecording = useCallback(async () => {
    try {
      setError(null);
      const stoppedSessionId = sessionIdRef.current;

      await flushSegment();
      captureRef.current?.stop();
      captureRef.current = null;
      setHasAudioCapture(false);
      resetSegmentState();

      if (stoppedSessionId) {
        unsubscribeFromSession(stoppedSessionId);
      }
      subRef.current = null;
      clearParticipantRefs();
      setUploadStatus(IDLE_UPLOAD);

      if (stoppedSessionId && session.status === "new") {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/sessions/${stoppedSessionId}/end`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Sessie beeindigen mislukt");
        }
      } else {
        await rpc("recording_stop");
      }

      setSession(IDLE_SESSION);
      markSessionEnded(stoppedSessionId);
      fetchActiveSessions().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sessie beeindigen mislukt");
    }
  }, [
    captureRef,
    clearParticipantRefs,
    fetchActiveSessions,
    flushSegment,
    markSessionEnded,
    resetSegmentState,
    session.status,
    sessionIdRef,
    setError,
    setHasAudioCapture,
    setSession,
    setUploadStatus,
    subRef,
    token,
  ]);

  const startMic = useCallback(
    async (source: AudioCaptureSource = "mic") => {
      if (!sessionIdRef.current) {
        setError("Sluit je aan bij een sessie voordat je de microfoon start");
        return;
      }
      if (!session.isOwner && session.status !== "recording") {
        setError("De sessie is nog niet gestart");
        return;
      }
      if (captureRef.current) {
        if (captureRef.current.isPaused()) {
          captureRef.current.resume();
          setSession((prev) => (prev.sessionId ? { ...prev, isMicActive: true } : prev));
        }
        return;
      }

      try {
        const sid = sessionIdRef.current;
        if (session.isOwner && session.status === "new") {
          await rpc("recording_begin", { session_id: sid });
          if (subRef.current == null && sid) {
            subRef.current = subscribeToSession(sid, handlePublication);
          }
          setSession((prev) => (prev.sessionId ? { ...prev, status: "recording" } : prev));
        } else if (session.isOwner && sid && subRef.current == null) {
          subRef.current = subscribeToSession(sid, handlePublication);
        }

        captureRef.current = await startAudioCapture(
          (pcm) => {
            if (!segmentStartMsRef.current) {
              segmentStartMsRef.current = Date.now();
            }
            segmentBufferRef.current.push(pcm);
            segmentBytesRef.current += pcm.byteLength;
          },
          source,
          () => {
            void flushSegment();
            captureRef.current = null;
            setHasAudioCapture(false);
            setSession((prev) => (prev.sessionId ? { ...prev, isMicActive: false } : prev));
          }
        );

        setHasAudioCapture(true);
        setSession((prev) => (prev.sessionId ? { ...prev, isMicActive: true } : prev));
        if (!segmentTimerRef.current) {
          segmentTimerRef.current = setInterval(() => {
            void flushSegment();
          }, 60_000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Microfoon starten mislukt");
      }
    },
    [
      captureRef,
      flushSegment,
      handlePublication,
      segmentBufferRef,
      segmentBytesRef,
      segmentStartMsRef,
      segmentTimerRef,
      session.isOwner,
      session.status,
      sessionIdRef,
      setError,
      setHasAudioCapture,
      setSession,
      subRef,
    ]
  );

  const stopMic = useCallback(() => {
    if (captureRef.current) {
      captureRef.current.pause();
    }
    void flushSegment();
    setSession((prev) => (prev.sessionId ? { ...prev, isMicActive: false } : prev));
  }, [captureRef, flushSegment, setSession]);

  return {
    startRecording,
    stopRecording,
    startMic,
    stopMic,
  };
}
