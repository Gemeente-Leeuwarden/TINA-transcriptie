import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Subscription } from "centrifuge/build/protobuf";
import type { AudioCaptureController } from "@/lib/audio";
import type {
  ActiveSessionSummary,
  SessionState,
  TranscriptEntry,
  UploadStatus,
} from "@/contexts/session/types";

export interface SessionActionsSharedParams {
  token: string | null;
  connected: boolean;
  session: SessionState;
  activeSessions: ActiveSessionSummary[];
  sessionIdRef: MutableRefObject<number | null>;
  captureRef: MutableRefObject<AudioCaptureController | null>;
  subRef: MutableRefObject<Subscription | null>;
  segmentBufferRef: MutableRefObject<Uint8Array[]>;
  segmentBytesRef: MutableRefObject<number>;
  segmentStartMsRef: MutableRefObject<number | null>;
  segmentTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  endedSessionsRef: MutableRefObject<Set<number>>;
  autoJoinAttemptedRef: MutableRefObject<boolean>;
  transcriptBaseMsRef: MutableRefObject<number | null>;
  flushSegment: () => Promise<void>;
  resetSegmentState: () => void;
  clearParticipantRefs: () => void;
  fetchActiveSessions: () => Promise<void>;
  markSessionEnded: (sessionId: number | null) => void;
  dismissInvite: (sessionId: number) => void;
  setError: Dispatch<SetStateAction<string | null>>;
  setSession: Dispatch<SetStateAction<SessionState>>;
  setTranscripts: Dispatch<SetStateAction<TranscriptEntry[]>>;
  setCurrentPartial: Dispatch<SetStateAction<string | null>>;
  setHasAudioCapture: Dispatch<SetStateAction<boolean>>;
  setUploadStatus: Dispatch<SetStateAction<UploadStatus>>;
  handlePublication: (msg: Record<string, unknown>) => void;
}

export interface SessionRecordingActions {
  startRecording: (purposeId: number) => Promise<void>;
  stopRecording: () => Promise<void>;
  startMic: (source?: import("@/lib/audio").AudioCaptureSource) => Promise<void>;
  stopMic: () => void;
}

export interface SessionMembershipActions {
  inviteUser: (email: string, role?: "owner" | "editor" | "viewer") => Promise<void>;
  declineInvite: (sessionId: number) => Promise<void>;
  leaveSession: () => Promise<void>;
}
