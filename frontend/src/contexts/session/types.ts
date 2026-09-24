import type { PurposeApi, PurposeSummary } from "@/lib/purpose";
import type { AudioCaptureSource } from "@/lib/audio";

export interface TranscriptEntry {
  text: string;
  transcript?: string;
  isFinal: boolean;
  sessionId: number;
  timestamp: number;
  startTimeMs?: number;
  endTimeMs?: number;
  animate?: boolean;
}

export type SegmentTimelineItem = {
  segment_id: number;
  session_id: number;
  user_id: number;
  sequence: number;
  transcript: string;
  summary?: string;
  started_at_ms: number;
  ended_at_ms: number;
};

export interface SessionState {
  sessionId: number | null;
  isOwner: boolean;
  isRecording: boolean;
  inviteCode: string | null;
  isMicActive: boolean;
  status: string | null;
  role: "owner" | "editor" | "viewer" | null;
  purpose: PurposeSummary | null;
}

export const IDLE_SESSION: SessionState = {
  sessionId: null,
  isOwner: false,
  isRecording: false,
  inviteCode: null,
  isMicActive: false,
  status: null,
  role: null,
  purpose: null,
};

export interface ActiveSessionSummary {
  sessionId: number;
  status: string;
  role: string;
  inviteCode?: string;
  updatedAt: string;
  purpose?: PurposeSummary | null;
}

export interface ActiveSessionSummaryApi {
  session_id: number;
  status: string;
  role: string;
  invite_code?: string;
  updated_at: string;
  purpose?: PurposeApi;
}

export interface SessionInviteNotification {
  sessionId: number;
  inviteCode: string;
  inviterEmail: string;
  role: string;
  receivedAt: number;
}

export interface ParticipantInfo {
  userId: number;
  email: string;
  role: string;
}

export interface UploadStatus {
  sessionId: number | null;
  status: "processing" | "completed" | "error" | null;
  transcription?: string;
  error?: string;
}

export const IDLE_UPLOAD: UploadStatus = { sessionId: null, status: null };

export type NotificationType = "good" | "warning" | "bad";

export interface SessionContextValue {
  connected: boolean;
  session: SessionState;
  transcripts: TranscriptEntry[];
  currentPartial: string | null;
  hasAudioCapture: boolean;
  activeSessions: ActiveSessionSummary[];
  participants: ParticipantInfo[];
  invites: SessionInviteNotification[];
  removedSessionId: number | null;
  uploadStatus: UploadStatus;
  error: string | null;
  startRecording: (purposeId: number) => Promise<void>;
  stopRecording: () => Promise<void>;
  startMic: (source?: AudioCaptureSource) => Promise<void>;
  stopMic: () => void;
  inviteUser: (email: string, role?: "owner" | "editor" | "viewer") => Promise<void>;
  declineInvite: (sessionId: number) => Promise<void>;
  joinSession: (sessionIdOrCode: string | number) => Promise<void>;
  leaveSession: () => Promise<void>;
  refreshActiveSessions: () => Promise<void>;
  dismissInvite: (sessionId: number) => void;
  clearRemovedSession: () => void;
  clearError: () => void;
  setSingleTranscript: (text: string, sessionId?: number) => void;
  setUploadProcessing: (sessionId: number) => void;
}
