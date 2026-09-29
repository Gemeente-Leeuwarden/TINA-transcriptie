import type { ParsedTranscriptLine } from "@/pages/session-detail/types";

export const SPEAKER_COLORS = [
  "text-blue-600",
  "text-emerald-600",
  "text-purple-600",
  "text-amber-600",
  "text-rose-600",
  "text-cyan-600",
  "text-indigo-600",
  "text-teal-600",
];

export function parseTranscriptLine(line: string): ParsedTranscriptLine {
  const match = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(?:(Speaker \d+):\s*)?(.*)$/);
  if (!match) return { timestamp: "", speaker: null, text: line };
  return {
    timestamp: match[1],
    speaker: match[2] ?? null,
    text: match[3],
  };
}

// Transcript stamps are offsets from the start of the recording, so 0 is a
// real value (the first line) rather than "missing". Fixed-width hh:mm:ss keeps
// the left edge of a long transcript aligned.
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatPromptStatus(status: string): string {
  if (status === "completed") return "Afgerond";
  if (status === "failed") return "Mislukt";
  if (status === "processing") return "Bezig";
  if (status === "queued") return "In wachtrij";
  return status;
}

export function promptStatusClass(status: string): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-rose-100 text-rose-700";
  if (status === "processing" || status === "queued") return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
}

export function promptStatusDotClass(status: string): string {
  if (status === "completed") return "bg-emerald-500";
  if (status === "failed") return "bg-rose-500";
  if (status === "processing" || status === "queued") return "bg-amber-500";
  return "bg-slate-400";
}

type TranscriptLineLike = {
  start_ms: number;
  speaker: string;
  text: string;
};

export function buildTranscriptExportText(params: {
  hasStructuredLines: boolean;
  transcriptLines: TranscriptLineLike[];
  transcription: string;
  getDisplayName: (speaker: string) => string;
}): string {
  const { hasStructuredLines, transcriptLines, transcription, getDisplayName } = params;

  if (!hasStructuredLines) {
    return transcription ?? "";
  }

  return transcriptLines
    .map((line) => {
      const ts = formatMs(line.start_ms);
      const name = getDisplayName(line.speaker);
      const prefix = ts ? `[${ts}] ` : "";
      const speakerPrefix = name ? `${name}: ` : "";
      return `${prefix}${speakerPrefix}${line.text}`;
    })
    .join("\n");
}
