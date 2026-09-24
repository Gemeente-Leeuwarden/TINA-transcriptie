import { useCallback, useMemo } from "react";
import { unsubscribeFromSession } from "@/lib/centrifuge";
import { IDLE_SESSION, type ParticipantInfo } from "@/contexts/session/types";
import { showNotificationToast } from "@/contexts/session/event-handlers/notification";
import type { EventHandlerMap, SessionEventHandlersParams } from "@/contexts/session/event-handlers/types";

export function useSessionChannelHandlers({
  setTranscripts,
  setCurrentPartial,
  setParticipants,
  setUploadStatus,
  setSession,
  clearParticipantRefs,
  markSessionEnded,
  fetchActiveSessions,
  resetToIdle,
  setSingleTranscript,
  participantsRef,
  participantsInitializedRef,
  transcriptBaseMsRef,
  subRef,
}: Pick<
  SessionEventHandlersParams,
  | "setTranscripts"
  | "setCurrentPartial"
  | "setParticipants"
  | "setUploadStatus"
  | "setSession"
  | "clearParticipantRefs"
  | "markSessionEnded"
  | "fetchActiveSessions"
  | "resetToIdle"
  | "setSingleTranscript"
  | "participantsRef"
  | "participantsInitializedRef"
  | "transcriptBaseMsRef"
  | "subRef"
>): EventHandlerMap {
  const handleNotification = useCallback((msg: Record<string, unknown>) => {
    showNotificationToast(msg);
  }, []);

  const handlePartialTranscript = useCallback(
    (msg: Record<string, unknown>) => {
      const text = msg.text as string;
      const isFinal = msg.is_final as boolean;
      if (isFinal) {
        const startTimeMs =
          typeof msg.start_time_ms === "number" ? (msg.start_time_ms as number) : undefined;
        const endTimeMs =
          typeof msg.end_time_ms === "number" ? (msg.end_time_ms as number) : undefined;
        setTranscripts((prev) => [
          ...prev,
          {
            text,
            isFinal: true,
            sessionId: msg.session_id as number,
            timestamp: Date.now(),
            startTimeMs,
            endTimeMs,
            animate: true,
          },
        ]);
        setCurrentPartial(null);
      } else {
        setCurrentPartial(text);
      }
    },
    [setCurrentPartial, setTranscripts]
  );

  const handleSegmentSummary = useCallback(
    (msg: Record<string, unknown>) => {
      const transcript = typeof msg.transcript === "string" ? msg.transcript.trim() : "";
      const summary = typeof msg.summary === "string" ? msg.summary.trim() : "";
      const text = summary || transcript;
      if (!text) return;

      const rawStart =
        typeof msg.started_at_ms === "number" ? (msg.started_at_ms as number) : undefined;
      const rawEnd = typeof msg.ended_at_ms === "number" ? (msg.ended_at_ms as number) : undefined;
      if (rawStart && transcriptBaseMsRef.current == null) {
        transcriptBaseMsRef.current = rawStart;
      }
      const base = transcriptBaseMsRef.current ?? 0;
      const startTimeMs = rawStart ? rawStart - base : undefined;
      const endTimeMs = rawEnd && base ? rawEnd - base : undefined;
      setTranscripts((prev) => [
        ...prev,
        {
          text,
          transcript: transcript && summary && summary !== transcript ? transcript : undefined,
          isFinal: true,
          sessionId: msg.session_id as number,
          timestamp: Date.now(),
          startTimeMs,
          endTimeMs,
          animate: true,
        },
      ]);
    },
    [setTranscripts, transcriptBaseMsRef]
  );

  const handleParticipantsUpdated = useCallback(
    (msg: Record<string, unknown>) => {
      const incoming = (msg.participants as Array<Record<string, unknown>>) ?? [];
      const nextParticipants = incoming.map((participant) => ({
        userId: participant.user_id as number,
        email: participant.email as string,
        role: participant.role as string,
      }));

      const nextMap = new Map<number, ParticipantInfo>();
      for (const participant of nextParticipants) {
        nextMap.set(participant.userId, participant);
      }

      if (participantsInitializedRef.current) {
        const now = Date.now();
        const prevMap = participantsRef.current;

        for (const [userId, participant] of nextMap.entries()) {
          if (!prevMap.has(userId)) {
            setTranscripts((prev) => [
              ...prev,
              {
                text: `${participant.email} is toegevoegd aan de sessie`,
                isFinal: true,
                sessionId: msg.session_id as number,
                timestamp: now,
                animate: true,
              },
            ]);
          }
        }

        for (const [userId, participant] of prevMap.entries()) {
          if (!nextMap.has(userId)) {
            setTranscripts((prev) => [
              ...prev,
              {
                text: `${participant.email} heeft de sessie verlaten`,
                isFinal: true,
                sessionId: msg.session_id as number,
                timestamp: now,
                animate: true,
              },
            ]);
          }
        }
      } else {
        participantsInitializedRef.current = true;
      }

      participantsRef.current = nextMap;
      setParticipants(nextParticipants);
    },
    [participantsInitializedRef, participantsRef, setParticipants, setTranscripts]
  );

  const handleUploadCompleted = useCallback(
    (msg: Record<string, unknown>) => {
      const sessionId = msg.session_id as number;
      const text = (msg.transcription as string) ?? "";
      setUploadStatus({
        sessionId,
        status: "completed",
        transcription: text,
      });
      setSingleTranscript(text, sessionId);
      if (sessionId) {
        unsubscribeFromSession(sessionId);
      }
      subRef.current = null;
      clearParticipantRefs();
      setSession((prev) => (prev.sessionId === sessionId ? IDLE_SESSION : prev));
      markSessionEnded(sessionId);
      fetchActiveSessions().catch(() => {});
    },
    [
      clearParticipantRefs,
      fetchActiveSessions,
      markSessionEnded,
      setSession,
      setSingleTranscript,
      setUploadStatus,
      subRef,
    ]
  );

  const handleUploadFailed = useCallback(
    (msg: Record<string, unknown>) => {
      const sessionId = msg.session_id as number;
      const message = (msg.error as string) ?? "Upload verwerken mislukt";
      setUploadStatus({
        sessionId,
        status: "error",
        error: message,
      });
      if (sessionId) {
        unsubscribeFromSession(sessionId);
      }
      subRef.current = null;
      clearParticipantRefs();
      setSession((prev) => (prev.sessionId === sessionId ? IDLE_SESSION : prev));
      markSessionEnded(sessionId);
      fetchActiveSessions().catch(() => {});
    },
    [clearParticipantRefs, fetchActiveSessions, markSessionEnded, setSession, setUploadStatus, subRef]
  );

  const handleSessionStarted = useCallback(
    (msg: Record<string, unknown>) => {
      const sessionId = msg.session_id as number;
      const status = (msg.status as string) ?? "recording";
      setSession((prev) => (prev.sessionId === sessionId ? { ...prev, status } : prev));
      fetchActiveSessions().catch(() => {});
    },
    [fetchActiveSessions, setSession]
  );

  const handleSessionEnded = useCallback(
    (msg: Record<string, unknown>) => {
      const sessionId = msg.session_id as number;
      resetToIdle();
      markSessionEnded(sessionId);
      fetchActiveSessions().catch(() => {});
    },
    [fetchActiveSessions, markSessionEnded, resetToIdle]
  );

  return useMemo(
    () => ({
      partial_transcript: handlePartialTranscript,
      segment_summary: handleSegmentSummary,
      participants_updated: handleParticipantsUpdated,
      upload_completed: handleUploadCompleted,
      upload_failed: handleUploadFailed,
      session_started: handleSessionStarted,
      session_ended: handleSessionEnded,
      notification: handleNotification,
      good: handleNotification,
      warning: handleNotification,
      bad: handleNotification,
    }),
    [
      handleNotification,
      handlePartialTranscript,
      handleParticipantsUpdated,
      handleSegmentSummary,
      handleSessionEnded,
      handleSessionStarted,
      handleUploadCompleted,
      handleUploadFailed,
    ]
  );
}
