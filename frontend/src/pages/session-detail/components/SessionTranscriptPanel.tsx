import { SpeakerLabel } from "@/pages/session-detail/components/SpeakerLabel";
import type { TranscriptPanelProps } from "@/pages/session-detail/components/session-content-types";
import { formatMs } from "@/pages/session-detail/utils";

export function SessionTranscriptPanel({
  hasStructuredLines,
  transcriptLines,
  transcriptChunks,
  speakerColorMap,
  canRenameSpeakers,
  getDisplayName,
  onRenameSpeaker,
}: TranscriptPanelProps) {
  if (hasStructuredLines) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900">
        <div className="space-y-1">
          {transcriptLines.map((line) => (
            <div key={line.sequence} className="flex gap-2">
              {line.start_ms > 0 && (
                <span className="shrink-0 font-mono text-xs text-slate-400 pt-0.5">
                  [{formatMs(line.start_ms)}]
                </span>
              )}
              <div>
                {line.speaker && (
                  <SpeakerLabel
                    speaker={line.speaker}
                    displayName={getDisplayName(line.speaker)}
                    colorClass={speakerColorMap.get(line.speaker) ?? ""}
                    canEdit={canRenameSpeakers}
                    onRename={onRenameSpeaker}
                  />
                )}
                <span>{line.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transcriptChunks.length > 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900">
        <div className="space-y-1">
          {transcriptChunks.map((chunk, index) => (
            <div key={index} className="flex gap-2">
              {chunk.timestamp && (
                <span className="shrink-0 font-mono text-xs text-slate-400 pt-0.5">
                  [{chunk.timestamp}]
                </span>
              )}
              <div>
                {chunk.speaker && (
                  <SpeakerLabel
                    speaker={chunk.speaker}
                    displayName={getDisplayName(chunk.speaker)}
                    colorClass={speakerColorMap.get(chunk.speaker) ?? ""}
                    canEdit={canRenameSpeakers}
                    onRename={onRenameSpeaker}
                  />
                )}
                <span>{chunk.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Nog geen transcript beschikbaar.</p>;
}
