import { ChevronDown } from "lucide-react";
import { formatTimestamp } from "@/lib/formatters";
import type { SessionState, TranscriptEntry } from "@/contexts/session/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TranscriptCardProps {
  session: SessionState;
  transcripts: TranscriptEntry[];
  currentPartial: string | null;
  expandedTranscriptKeys: Set<string>;
  onToggleExpandedTranscript: (entryKey: string) => void;
}

export function TranscriptCard({
  session,
  transcripts,
  currentPartial,
  expandedTranscriptKeys,
  onToggleExpandedTranscript,
}: TranscriptCardProps) {
  return (
    <Card>
      <CardHeader className="items-center gap-3">
        <CardTitle className="text-3xl text-center">Transcriptie</CardTitle>
      </CardHeader>
      <CardContent>
        {transcripts.length === 0 && !currentPartial ? (
          <p className="text-muted-foreground">
            {session.isRecording
              ? "Aan het luisteren..."
              : "Nog geen transcript. Start een opname om te beginnen."}
          </p>
        ) : (
          <div className="relative rounded-3xl bg-slate-50/70 px-4 py-6 text-sm">
            <div className="absolute inset-x-0 -top-6 h-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-100 via-transparent to-transparent" />
            {currentPartial && (
              <div className="relative mb-8 rounded-3xl border border-dashed border-amber-200 bg-amber-50/70 px-5 py-4 text-xs text-amber-900 shadow-[0_10px_30px_-20px_rgba(251,191,36,0.8)]">
                <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-amber-700">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  Live
                </div>
                <div className="whitespace-pre-wrap text-sm">{currentPartial}</div>
              </div>
            )}
            <div className="relative">
              <div className="absolute left-3 top-0 h-full w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-300 via-rose-300 to-sky-300 md:left-1/2" />
              <div className="space-y-6">
                {[...transcripts].reverse().map((transcript, index) => {
                  const timeLabel = formatTimestamp(transcript.startTimeMs);
                  const isLeft = index % 2 === 0;
                  const entryKey = `${transcript.sessionId}-${transcript.timestamp}-${index}`;
                  const hasFullTranscript =
                    typeof transcript.transcript === "string" &&
                    transcript.transcript.length > 0 &&
                    transcript.transcript !== transcript.text;
                  const showFullTranscript =
                    hasFullTranscript && expandedTranscriptKeys.has(entryKey);
                  return (
                    <div
                      key={entryKey}
                      className={transcript.animate ? "grid animate-[timeline-drop-in_600ms_ease-out_both]" : ""}
                      style={transcript.animate ? { gridTemplateRows: "1fr" } : undefined}
                    >
                      <div className={transcript.animate ? "min-h-0 overflow-hidden" : ""}>
                        <div className="relative md:grid md:grid-cols-[1fr_auto_1fr] md:items-start">
                          <div
                            className={`${
                              isLeft ? "md:col-start-1 md:pr-10 md:text-right" : "md:col-start-3 md:pl-10"
                            } mb-4 md:mb-0`}
                          >
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-500 shadow-sm ring-1 ring-slate-200">
                              <span className="h-2 w-2 rounded-full bg-sky-400" />
                              {timeLabel || "--:--"}
                            </div>
                            <div
                              className={`mt-3 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 text-left shadow-[0_20px_40px_-30px_rgba(15,23,42,0.5)] ${
                                transcript.animate ? "animate-[timeline-card-enter_500ms_ease-out_100ms_both]" : ""
                              }`}
                            >
                              <div className="whitespace-pre-wrap text-sm text-slate-900">
                                {transcript.text}
                              </div>
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
                                    <div className="whitespace-pre-wrap">{transcript.transcript}</div>
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
                          <div className="absolute left-3 top-8 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-sky-200 md:left-1/2 md:top-6">
                            <span className="h-2 w-2 rounded-full bg-sky-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
