import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionPromptPanel } from "@/pages/session-detail/components/SessionPromptPanel";
import { SessionTimelinePanel } from "@/pages/session-detail/components/SessionTimelinePanel";
import { SessionTranscriptPanel } from "@/pages/session-detail/components/SessionTranscriptPanel";
import type { TimelineEntry } from "@/pages/session-detail/components/session-content-types";
import type {
  ParsedTranscriptLine,
  PromptResultItem,
  TranscriptLine,
} from "@/pages/session-detail/types";
import {
  formatPromptStatus,
  promptStatusDotClass,
} from "@/pages/session-detail/utils";

interface SessionContentCardProps {
  activeContent: "transcript" | "prompt";
  activeTab: "timeline" | "transcript";
  hasTimeline: boolean;
  hasStructuredLines: boolean;
  timelineItems: TimelineEntry[];
  transcriptChunks: ParsedTranscriptLine[];
  transcriptLines: TranscriptLine[];
  speakerColorMap: Map<string, string>;
  canRenameSpeakers: boolean;
  expandedTranscriptKeys: Set<string>;
  promptResults: PromptResultItem[];
  promptSelectValue: string | number;
  activePromptResult: PromptResultItem | null;
  activePromptTitle: string;
  activePromptText: string;
  hasActivePromptText: boolean;
  isPromptResultsLoading: boolean;
  promptResultsError: string | null;
  deletePromptError: string | null;
  deletingPromptResultId: number | null;
  purposePromptTitle: string | null;
  canApplyPrompts: boolean;
  onSetActiveContent: (value: "transcript" | "prompt") => void;
  onSetActiveTab: (value: "timeline" | "transcript") => void;
  onSelectPromptResult: (resultID: number | null) => void;
  onRefreshPromptResults: () => void | Promise<void>;
  onDeletePromptResult: (resultID: number) => void | Promise<void>;
  onToggleExpandedTranscript: (key: string) => void;
  getDisplayName: (speaker: string) => string;
  onRenameSpeaker: (speaker: string, value: string) => void;
}

export function SessionContentCard({
  activeContent,
  activeTab,
  hasTimeline,
  hasStructuredLines,
  timelineItems,
  transcriptChunks,
  transcriptLines,
  speakerColorMap,
  canRenameSpeakers,
  expandedTranscriptKeys,
  promptResults,
  promptSelectValue,
  activePromptResult,
  activePromptTitle,
  activePromptText,
  hasActivePromptText,
  isPromptResultsLoading,
  promptResultsError,
  deletePromptError,
  deletingPromptResultId,
  purposePromptTitle,
  canApplyPrompts,
  onSetActiveContent,
  onSetActiveTab,
  onSelectPromptResult,
  onRefreshPromptResults,
  onDeletePromptResult,
  onToggleExpandedTranscript,
  getDisplayName,
  onRenameSpeaker,
}: SessionContentCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Inhoud</CardTitle>
        <CardDescription>Transcriptie en promptresultaten</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-md border bg-muted/20 p-1">
            <Button
              type="button"
              size="sm"
              variant={activeContent === "transcript" ? "secondary" : "ghost"}
              onClick={() => onSetActiveContent("transcript")}
            >
              Transcriptie
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeContent === "prompt" ? "secondary" : "ghost"}
              onClick={() => onSetActiveContent("prompt")}
            >
              Promptresultaten
            </Button>
          </div>
          {activeContent === "transcript" ? (
            <div className="inline-flex rounded-md border bg-muted/20 p-1">
              {hasTimeline && (
                <Button
                  type="button"
                  size="sm"
                  variant={activeTab === "timeline" ? "secondary" : "ghost"}
                  onClick={() => onSetActiveTab("timeline")}
                >
                  Tijdlijn
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant={activeTab === "transcript" ? "secondary" : "ghost"}
                onClick={() => onSetActiveTab("transcript")}
              >
                Transcript
              </Button>
            </div>
          ) : (
            <div className="inline-flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-2 py-1 xl:hidden">
              <span className="px-1 text-xs font-medium text-muted-foreground">Resultaat</span>
              <select
                value={promptSelectValue}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  onSelectPromptResult(Number.isNaN(value) ? null : value);
                }}
                className="h-8 rounded-md border bg-transparent px-2 text-xs text-foreground shadow-xs outline-none"
                disabled={promptResults.length === 0}
                aria-label="Promptresultaat"
              >
                {promptResults.length === 0 ? (
                  <option value="">Geen promptresultaten</option>
                ) : (
                  promptResults.map((result) => (
                    <option key={result.id} value={result.id}>
                      {result.prompt?.title ?? `Prompt #${result.prompt_id}`} - {formatPromptStatus(result.status)}
                    </option>
                  ))
                )}
              </select>
              {activePromptResult && (
                <span className={`inline-flex size-2 rounded-full ${promptStatusDotClass(activePromptResult.status)}`} />
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          {activeContent === "prompt" ? (
            <SessionPromptPanel
              purposePromptTitle={purposePromptTitle}
              deletePromptError={deletePromptError}
              activePromptResult={activePromptResult}
              activePromptTitle={activePromptTitle}
              activePromptText={activePromptText}
              hasActivePromptText={hasActivePromptText}
              isPromptResultsLoading={isPromptResultsLoading}
              promptResultsError={promptResultsError}
              promptResultsCount={promptResults.length}
              canApplyPrompts={canApplyPrompts}
              deletingPromptResultId={deletingPromptResultId}
              onRefreshPromptResults={onRefreshPromptResults}
              onDeletePromptResult={onDeletePromptResult}
            />
          ) : activeTab === "timeline" && hasTimeline ? (
            <SessionTimelinePanel
              timelineItems={timelineItems}
              expandedTranscriptKeys={expandedTranscriptKeys}
              onToggleExpandedTranscript={onToggleExpandedTranscript}
            />
          ) : (
            <SessionTranscriptPanel
              hasStructuredLines={hasStructuredLines}
              transcriptLines={transcriptLines}
              transcriptChunks={transcriptChunks}
              speakerColorMap={speakerColorMap}
              canRenameSpeakers={canRenameSpeakers}
              getDisplayName={getDisplayName}
              onRenameSpeaker={onRenameSpeaker}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
