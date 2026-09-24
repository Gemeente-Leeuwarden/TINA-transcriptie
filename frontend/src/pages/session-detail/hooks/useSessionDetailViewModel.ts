import { useMemo } from "react";
import { SPEAKER_COLORS, parseTranscriptLine } from "@/pages/session-detail/utils";
import type {
  ParsedTranscriptLine,
  PromptResultItem,
  SegmentTimelineItem,
  SessionDetail,
  TranscriptLine,
} from "@/pages/session-detail/types";

type TimelineItem = {
  text: string;
  transcript?: string;
  startTimeMs?: number;
  sequence: number;
};

type UseSessionDetailViewModelParams = {
  detail: SessionDetail | null;
  segments: SegmentTimelineItem[];
  selectedTab: "timeline" | "transcript" | null;
  activePromptResult: PromptResultItem | null;
};

export function useSessionDetailViewModel({
  detail,
  segments,
  selectedTab,
  activePromptResult,
}: UseSessionDetailViewModelParams) {
  const hasStructuredLines = (detail?.transcriptLines?.length ?? 0) > 0;

  const transcriptChunks = useMemo(() => {
    const raw = detail?.transcription?.trim();
    if (!raw) return [] as ParsedTranscriptLine[];

    return raw
      .split(/\n+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map(parseTranscriptLine);
  }, [detail?.transcription]);

  const speakerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (hasStructuredLines) {
      for (const line of detail?.transcriptLines ?? []) {
        if (line.speaker && !map.has(line.speaker)) {
          map.set(line.speaker, SPEAKER_COLORS[map.size % SPEAKER_COLORS.length]);
        }
      }
    } else {
      for (const chunk of transcriptChunks) {
        if (chunk.speaker && !map.has(chunk.speaker)) {
          map.set(chunk.speaker, SPEAKER_COLORS[map.size % SPEAKER_COLORS.length]);
        }
      }
    }
    return map;
  }, [detail?.transcriptLines, hasStructuredLines, transcriptChunks]);

  const timelineItems = useMemo(() => {
    if (segments.length > 0) {
      const starts = segments
        .map((segment) => segment.started_at_ms)
        .filter((value) => typeof value === "number" && value > 0);
      const base = starts.length > 0 ? Math.min(...starts) : 0;
      const ordered = [...segments].sort((a, b) => {
        if (a.started_at_ms && b.started_at_ms && a.started_at_ms !== b.started_at_ms) {
          return a.started_at_ms - b.started_at_ms;
        }
        return a.sequence - b.sequence;
      });

      return ordered
        .filter((segment) => segment.summary || segment.transcript)
        .map((segment, index) => ({
          text: segment.summary || segment.transcript,
          transcript:
            segment.summary && segment.transcript && segment.summary !== segment.transcript
              ? segment.transcript
              : undefined,
          startTimeMs: segment.started_at_ms ? segment.started_at_ms - base : undefined,
          sequence: index + 1,
        })) as TimelineItem[];
    }

    return transcriptChunks.map((chunk, index) => ({
      text: chunk.speaker ? `${chunk.speaker}: ${chunk.text}` : chunk.text,
      transcript: undefined,
      sequence: index + 1,
      startTimeMs: undefined,
    })) as TimelineItem[];
  }, [segments, transcriptChunks]);

  const hasTimeline = segments.length > 0;
  const activeTab = useMemo(() => {
    if (!hasTimeline) return "transcript";
    return selectedTab ?? "timeline";
  }, [hasTimeline, selectedTab]);

  const activePromptTitle = activePromptResult
    ? activePromptResult.prompt?.title ?? `Prompt #${activePromptResult.prompt_id}`
    : "";
  const activePromptText = activePromptResult?.result?.trim() ?? "";
  const hasActivePromptText = activePromptText.length > 0;

  return {
    transcriptChunks,
    speakerColorMap,
    timelineItems,
    hasStructuredLines,
    hasTimeline,
    activeTab,
    activePromptTitle,
    activePromptText,
    hasActivePromptText,
    transcriptLines: (detail?.transcriptLines ?? []) as TranscriptLine[],
  };
}
