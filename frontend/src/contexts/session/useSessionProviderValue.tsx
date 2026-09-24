import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Subscription } from "centrifuge/build/protobuf";
import {
  disconnectCentrifuge,
  getCentrifuge,
} from "@/lib/centrifuge";
import {
  type AudioCaptureController,
} from "@/lib/audio";
import { mapPurpose } from "@/lib/purpose";
import {
  type ActiveSessionSummary,
  IDLE_SESSION,
  IDLE_UPLOAD,
  type ParticipantInfo,
  type SessionContextValue,
  type SessionInviteNotification,
  type SessionState,
  type TranscriptEntry,
  type UploadStatus,
} from "@/contexts/session/types";
import {
  decodeCentrifugeData,
} from "@/contexts/session/utils";
import {
  fetchActiveSessionsApi,
} from "@/contexts/session/api";
import { useSessionEventHandlers } from "@/contexts/session/useSessionEventHandlers";
import { useSessionActions } from "@/contexts/session/useSessionActions";

export function useSessionProviderValue(): SessionContextValue {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<SessionState>(IDLE_SESSION);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentPartial, setCurrentPartial] = useState<string | null>(null);
  const [hasAudioCapture, setHasAudioCapture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionSummary[]>([]);
  const [invites, setInvites] = useState<SessionInviteNotification[]>([]);
  const [removedSessionId, setRemovedSessionId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(IDLE_UPLOAD);

  // --- refs ---

  const segmentBufferRef = useRef<Uint8Array[]>([]);
  const segmentBytesRef = useRef(0);
  const segmentSeqRef = useRef(1);
  const segmentStartMsRef = useRef<number | null>(null);
  const segmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentFlushInProgressRef = useRef(false);

  const participantsRef = useRef<Map<number, ParticipantInfo>>(new Map());
  const participantsInitializedRef = useRef(false);
  const endedSessionsRef = useRef<Set<number>>(new Set());
  const autoJoinAttemptedRef = useRef(false);
  const transcriptBaseMsRef = useRef<number | null>(null);

  const captureRef = useRef<AudioCaptureController | null>(null);
  const subRef = useRef<Subscription | null>(null);

  // Shadow session.sessionId in a ref so event handlers can read the latest
  // value without adding it to their dependency arrays. This prevents the
  // centrifuge connection effect from re-running when session state changes.
  const sessionIdRef = useRef<number | null>(null);
  useEffect(() => {
    sessionIdRef.current = session.sessionId;
  }, [session.sessionId]);

  // --- segment helpers ---

  const resetSegmentState = useCallback(() => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    segmentBufferRef.current = [];
    segmentBytesRef.current = 0;
    segmentSeqRef.current = 1;
    segmentStartMsRef.current = null;
    segmentFlushInProgressRef.current = false;
    transcriptBaseMsRef.current = null;
  }, []);

  const flushSegment = useCallback(async () => {
    if (segmentFlushInProgressRef.current) return;
    if (!sessionIdRef.current || !token) return;
    if (!segmentStartMsRef.current || segmentBytesRef.current === 0) return;

    segmentFlushInProgressRef.current = true;
    const sessionId = sessionIdRef.current;
    const sequence = segmentSeqRef.current;
    const startedAtMs = segmentStartMsRef.current;
    const endedAtMs = Date.now();
    const blob = new Blob(segmentBufferRef.current as BlobPart[], { type: "audio/pcm" });
    const form = new FormData();
    form.append("file", blob, `segment_${sequence}.pcm`);
    form.append("sequence", String(sequence));
    form.append("started_at_ms", String(startedAtMs));
    form.append("ended_at_ms", String(endedAtMs));

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/segments`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Segment upload mislukt");
      }
      segmentSeqRef.current += 1;
      segmentBufferRef.current = [];
      segmentBytesRef.current = 0;
      segmentStartMsRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Segment upload mislukt");
    } finally {
      segmentFlushInProgressRef.current = false;
    }
  }, [token]);

  // --- shared reset helper ---
  // Clears all mutable state associated with an active session. Callers should
  // handle unsubscribing from the session channel and any RPC calls before
  // invoking this.

  const clearParticipantRefs = useCallback(() => {
    setParticipants([]);
    participantsRef.current = new Map();
    participantsInitializedRef.current = false;
  }, []);

  const resetToIdle = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    setHasAudioCapture(false);
    resetSegmentState();
    subRef.current = null;
    setCurrentPartial(null);
    clearParticipantRefs();
    setUploadStatus(IDLE_UPLOAD);
    setSession(IDLE_SESSION);
  }, [resetSegmentState, clearParticipantRefs]);

  // --- data fetching ---

  const fetchActiveSessions = useCallback(async () => {
    if (!token) return;
    try {
      const sessions = await fetchActiveSessionsApi(token);
      const endedSessions = endedSessionsRef.current;
      const mapped = sessions
        .filter((s) => s.status === "new" || s.status === "recording")
        .filter((s) => !endedSessions.has(s.session_id))
        .map((s) => ({
          sessionId: s.session_id,
          status: s.status,
          role: s.role,
          inviteCode: s.invite_code,
          updatedAt: s.updated_at,
          purpose: s.purpose ? mapPurpose(s.purpose) : null,
        }));
      setActiveSessions(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Actieve sessies laden mislukt");
    }
  }, [token]);

  const markSessionEnded = useCallback((sessionId: number | null) => {
    if (!sessionId) return;
    endedSessionsRef.current.add(sessionId);
    setActiveSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  }, []);

  // ---------- simple actions ----------

  const clearError = useCallback(() => setError(null), []);
  const setSingleTranscript = useCallback((text: string, sessionId: number = 0) => {
    if (!text) {
      setTranscripts([]);
      setCurrentPartial(null);
      return;
    }
    setTranscripts([
      {
        text,
        isFinal: true,
        sessionId,
        timestamp: Date.now(),
        animate: true,
      },
    ]);
    setCurrentPartial(null);
  }, []);
  const setUploadProcessing = useCallback((sessionId: number) => {
    setUploadStatus({ sessionId, status: "processing" });
  }, []);
  const dismissInvite = useCallback(
    (sessionId: number) =>
      setInvites((prev) => prev.filter((invite) => invite.sessionId !== sessionId)),
    []
  );
  const clearRemovedSession = useCallback(() => setRemovedSessionId(null), []);

  const { handlePublication, handleUserPublication } = useSessionEventHandlers({
    setTranscripts,
    setCurrentPartial,
    setParticipants,
    setUploadStatus,
    setSession,
    setInvites,
    setRemovedSessionId,
    clearParticipantRefs,
    markSessionEnded,
    fetchActiveSessions,
    dismissInvite,
    resetToIdle,
    setSingleTranscript,
    participantsRef,
    participantsInitializedRef,
    transcriptBaseMsRef,
    sessionIdRef,
    subRef,
  });

  // ---------- connect / disconnect centrifuge ----------

  useEffect(() => {
    if (!token) {
      disconnectCentrifuge();
      setConnected(false);
      setActiveSessions([]);
      setInvites([]);
      resetToIdle();
      return;
    }

    const c = getCentrifuge(token);

    c.on("connected", () => setConnected(true));
    c.on("disconnected", (ctx) => {
      setConnected(false);
      if (ctx.reason && ctx.reason !== "disconnect called") {
        setError(`Verbinding verbroken: ${ctx.reason}`);
      }
      resetToIdle();
      autoJoinAttemptedRef.current = false;
    });
    c.on("publication", (ctx) => {
      if (!ctx.channel.startsWith("user:")) return;
      const msg = decodeCentrifugeData<Record<string, unknown>>(ctx.data);
      handleUserPublication(msg);
    });

    c.connect();
    fetchActiveSessions().catch(() => {});

    return () => {
      disconnectCentrifuge();
      setConnected(false);
    };
  }, [token, fetchActiveSessions, handleUserPublication, resetToIdle]);

  const {
    startRecording,
    stopRecording,
    startMic,
    stopMic,
    inviteUser,
    declineInvite,
    joinSession,
    leaveSession,
  } = useSessionActions({
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
  });

  return {
    connected,
    session,
    transcripts,
    currentPartial,
    hasAudioCapture,
    activeSessions,
    participants,
    invites,
    removedSessionId,
    uploadStatus,
    error,
    startRecording,
    stopRecording,
    startMic,
    stopMic,
    inviteUser,
    declineInvite,
    joinSession,
    leaveSession,
    refreshActiveSessions: fetchActiveSessions,
    dismissInvite,
    clearRemovedSession,
    clearError,
    setSingleTranscript,
    setUploadProcessing,
  };
}
