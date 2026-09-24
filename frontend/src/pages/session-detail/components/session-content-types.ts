import type { ParsedTranscriptLine, TranscriptLine } from "@/pages/session-detail/types";

export type TimelineEntry = {
  text: string;
  transcript?: string;
  sequence: number;
  startTimeMs?: number;
};

export interface TranscriptPanelProps {
  hasStructuredLines: boolean;
  transcriptLines: TranscriptLine[];
  transcriptChunks: ParsedTranscriptLine[];
  speakerColorMap: Map<string, string>;
  canRenameSpeakers: boolean;
  getDisplayName: (speaker: string) => string;
  onRenameSpeaker: (speaker: string, value: string) => void;
}
