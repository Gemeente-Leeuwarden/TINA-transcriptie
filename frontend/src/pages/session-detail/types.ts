import type { PurposeSummary } from "@/lib/purpose";

export type TranscriptLine = {
  sequence: number;
  speaker: string;
  start_ms: number;
  end_ms: number;
  text: string;
};

export type SessionDetail = {
  sessionId: number;
  status: string;
  role: string;
  transcription: string;
  transcriptLines: TranscriptLine[];
  speakerNames: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  files: string[];
  purpose?: PurposeSummary | null;
};

export type SessionMember = {
  userId: number;
  email: string;
  role: string;
};

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

export type PromptSummary = {
  id: number;
  title: string;
};

export type PromptResultItem = {
  id: number;
  session_id: number;
  prompt_id: number;
  prompt?: PromptSummary;
  status: string;
  result: string;
  error?: string;
  created_at: string;
  updated_at: string;
};

export type PromptOption = {
  id: number;
  title: string;
};

export type ParsedTranscriptLine = {
  timestamp: string;
  speaker: string | null;
  text: string;
};
