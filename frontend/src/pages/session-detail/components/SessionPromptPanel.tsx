import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import type { PromptResultItem } from "@/pages/session-detail/types";
import { formatPromptStatus, promptStatusClass } from "@/pages/session-detail/utils";

interface SessionPromptPanelProps {
  purposePromptTitle: string | null;
  deletePromptError: string | null;
  activePromptResult: PromptResultItem | null;
  activePromptTitle: string;
  activePromptText: string;
  hasActivePromptText: boolean;
  isPromptResultsLoading: boolean;
  promptResultsError: string | null;
  promptResultsCount: number;
  canApplyPrompts: boolean;
  deletingPromptResultId: number | null;
  onRefreshPromptResults: () => void | Promise<void>;
  onDeletePromptResult: (resultId: number) => void | Promise<void>;
}

export function SessionPromptPanel({
  purposePromptTitle,
  deletePromptError,
  activePromptResult,
  activePromptTitle,
  activePromptText,
  hasActivePromptText,
  isPromptResultsLoading,
  promptResultsError,
  promptResultsCount,
  canApplyPrompts,
  deletingPromptResultId,
  onRefreshPromptResults,
  onDeletePromptResult,
}: SessionPromptPanelProps) {
  return (
    <div className="space-y-3">
      {purposePromptTitle && (
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Doelprompt: <span className="font-medium text-foreground">{purposePromptTitle}</span>
        </div>
      )}
      {deletePromptError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deletePromptError}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">
          {activePromptResult ? "Geselecteerd resultaat" : "Promptresultaten"}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void onRefreshPromptResults()}
          disabled={isPromptResultsLoading}
        >
          {isPromptResultsLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Vernieuwen
        </Button>
      </div>
      {promptResultsError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {promptResultsError}
        </div>
      )}
      {isPromptResultsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Promptresultaten laden...
        </div>
      ) : !activePromptResult ? (
        <p className="text-sm text-muted-foreground">
          {promptResultsCount === 0 ? "Nog geen promptresultaten." : "Selecteer een promptresultaat."}
        </p>
      ) : (
        <div className="rounded-md border px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium">{activePromptTitle}</div>
              <div className="text-xs text-muted-foreground">
                Bijgewerkt: {formatDate(activePromptResult.updated_at)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${promptStatusClass(
                  activePromptResult.status
                )}`}
              >
                {formatPromptStatus(activePromptResult.status)}
              </span>
              {canApplyPrompts && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void onDeletePromptResult(activePromptResult.id)}
                  disabled={deletingPromptResultId === activePromptResult.id}
                >
                  {deletingPromptResultId === activePromptResult.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Verwijderen
                </Button>
              )}
            </div>
          </div>
          {activePromptResult.error && (
            <div className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {activePromptResult.error}
            </div>
          )}
          {hasActivePromptText ? (
            <div className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/20 px-3 py-2 text-sm text-foreground">
              {activePromptText}
            </div>
          ) : !activePromptResult.error ? (
            <div className="mt-2 text-xs text-muted-foreground">Wacht op verwerking...</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
