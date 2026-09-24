import { ChevronDown } from "lucide-react";
import { formatTimestamp } from "@/lib/formatters";
import type { TimelineEntry } from "@/pages/session-detail/components/session-content-types";

interface SessionTimelinePanelProps {
  timelineItems: TimelineEntry[];
  expandedTranscriptKeys: Set<string>;
  onToggleExpandedTranscript: (key: string) => void;
}

export function SessionTimelinePanel({
  timelineItems,
  expandedTranscriptKeys,
  onToggleExpandedTranscript,
}: SessionTimelinePanelProps) {
  if (timelineItems.length === 0) {
    return <p className="text-sm text-muted-foreground">Nog geen transcript beschikbaar.</p>;
  }

  return (
    <div className="relative rounded-3xl bg-slate-50/70 px-4 py-6 text-sm">
      <div className="absolute inset-x-0 -top-6 h-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-100 via-transparent to-transparent" />
      <div className="relative">
        <div className="absolute left-3 top-0 h-full w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-300 via-rose-300 to-sky-300 md:left-1/2" />
        <div className="space-y-6">
          {timelineItems.map((item, index) => {
            const timeLabel = formatTimestamp(item.startTimeMs);
            const label = timeLabel || `Segment ${item.sequence}`;
            const isLeft = index % 2 === 0;
            const entryKey = `${item.sequence}-${index}`;
            const hasFullTranscript =
              typeof item.transcript === "string" &&
              item.transcript.length > 0 &&
              item.transcript !== item.text;
            const showFullTranscript = hasFullTranscript && expandedTranscriptKeys.has(entryKey);

            return (
              <div
                key={`${index}-${item.text.slice(0, 12)}`}
                className="relative md:grid md:grid-cols-[1fr_auto_1fr] md:items-start"
              >
                <div
                  className={`${
                    isLeft ? "md:col-start-1 md:pr-10 md:text-right" : "md:col-start-3 md:pl-10"
                  } mb-4 md:mb-0`}
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-500 shadow-sm ring-1 ring-slate-200">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    {label}
                  </div>
                  <div className="mt-3 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 text-left shadow-[0_20px_40px_-30px_rgba(15,23,42,0.5)]">
                    <div className="whitespace-pre-wrap text-sm text-slate-900">{item.text}</div>
                    {hasFullTranscript && (
                      <div className="mt-3">
                        <div
                          className={`overflow-hidden border-t border-slate-200 bg-slate-100/80 px-3 py-2 text-xs text-slate-700 transition-[max-height,opacity] duration-300 ${
                            showFullTranscript ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="mb-1 font-medium uppercase tracking-wide text-slate-500">
                            Volledig transcript
                          </div>
                          <div className="whitespace-pre-wrap">{item.transcript}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleExpandedTranscript(entryKey)}
                          aria-expanded={showFullTranscript}
                          className="mt-3 flex w-full items-center justify-center gap-1 border-t border-slate-200 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-700"
                        >
                          <ChevronDown
                            className={`size-3 transition-transform ${showFullTranscript ? "rotate-180" : ""}`}
                          />
                          {showFullTranscript ? "Verberg transcriptie" : "Bekijk transcriptie"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute left-3 top-8 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-rose-200 md:left-1/2 md:top-6">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
