import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Subscription } from "centrifuge/build/protobuf";
import type {
  ParticipantInfo,
  SessionInviteNotification,
  SessionState,
  TranscriptEntry,
  UploadStatus,
} from "@/contexts/session/types";

export interface SessionEventHandlersParams {
  setTranscripts: Dispatch<SetStateAction<TranscriptEntry[]>>;
  setCurrentPartial: Dispatch<SetStateAction<string | null>>;
  setParticipants: Dispatch<SetStateAction<ParticipantInfo[]>>;
  setUploadStatus: Dispatch<SetStateAction<UploadStatus>>;
  setSession: Dispatch<SetStateAction<SessionState>>;
  setInvites: Dispatch<SetStateAction<SessionInviteNotification[]>>;
  setRemovedSessionId: Dispatch<SetStateAction<number | null>>;
  clearParticipantRefs: () => void;
  markSessionEnded: (sessionId: number | null) => void;
  fetchActiveSessions: () => Promise<void>;
  dismissInvite: (sessionId: number) => void;
  resetToIdle: () => void;
  setSingleTranscript: (text: string, sessionId?: number) => void;
  participantsRef: MutableRefObject<Map<number, ParticipantInfo>>;
  participantsInitializedRef: MutableRefObject<boolean>;
  transcriptBaseMsRef: MutableRefObject<number | null>;
  sessionIdRef: MutableRefObject<number | null>;
  subRef: MutableRefObject<Subscription | null>;
}

export type EventHandler = (msg: Record<string, unknown>) => void;
export type EventHandlerMap = Record<string, EventHandler>;
