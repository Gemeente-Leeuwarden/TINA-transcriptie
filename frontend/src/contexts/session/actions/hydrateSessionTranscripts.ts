import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { fetchSessionSegmentsApi } from "@/contexts/session/api";
import type { TranscriptEntry } from "@/contexts/session/types";

interface HydrateSessionTranscriptsParams {
  token: string | null;
  sessionId: number;
  transcriptBaseMsRef: MutableRefObject<number | null>;
  setTranscripts: Dispatch<SetStateAction<TranscriptEntry[]>>;
}

export async function hydrateSessionTranscripts({
  token,
  sessionId,
  transcriptBaseMsRef,
  setTranscripts,
}: HydrateSessionTranscriptsParams): Promise<void> {
  if (!token) return;

  const segments = await fetchSessionSegmentsApi(token, sessionId);
  if (segments.length === 0) return;

  const starts = segments
    .map((segment) => segment.started_at_ms)
    .filter((value) => typeof value === "number" && value > 0);

  transcriptBaseMsRef.current = starts.length > 0 ? Math.min(...starts) : null;
  const base = transcriptBaseMsRef.current ?? 0;
  const ordered = [...segments].sort((a, b) => {
    if (a.started_at_ms && b.started_at_ms && a.started_at_ms !== b.started_at_ms) {
      return a.started_at_ms - b.started_at_ms;
    }
    return a.sequence - b.sequence;
  });

  setTranscripts(
    ordered
      .filter((segment) => segment.summary || segment.transcript)
      .map((segment) => ({
        text: segment.summary || segment.transcript,
        transcript:
          segment.summary && segment.transcript && segment.summary !== segment.transcript
            ? segment.transcript
            : undefined,
        isFinal: true,
        sessionId: segment.session_id,
        timestamp: Date.now(),
        startTimeMs: segment.started_at_ms ? segment.started_at_ms - base : undefined,
        endTimeMs: segment.ended_at_ms ? segment.ended_at_ms - base : undefined,
        animate: false,
      }))
  );
}
