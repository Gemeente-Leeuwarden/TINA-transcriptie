import { Loader2, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import type { PromptResultItem } from "@/pages/session-detail/types";
import { formatPromptStatus, promptStatusClass, promptStatusDotClass } from "@/pages/session-detail/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PromptResultsSidebarProps {
  isSessionFinished: boolean;
  isPromptResultsLoading: boolean;
  promptResultsError: string | null;
  promptResults: PromptResultItem[];
  activePromptResultId: number | null;
  onRefresh: () => void | Promise<void>;
  onSelectResult: (resultID: number) => void;
}

export function PromptResultsSidebar({
  isSessionFinished,
  isPromptResultsLoading,
  promptResultsError,
  promptResults,
  activePromptResultId,
  onRefresh,
  onSelectResult,
}: PromptResultsSidebarProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Promptresultaten</CardTitle>
            <CardDescription>Alle resultaten voor deze sessie</CardDescription>
          </div>
          {isSessionFinished && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => void onRefresh()}
              disabled={isPromptResultsLoading}
              aria-label="Vernieuwen"
            >
              {isPromptResultsLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
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
        ) : promptResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen promptresultaten.</p>
        ) : (
          <div className="space-y-2">
            {promptResults.map((result) => {
              const isActive = result.id === activePromptResultId;
              const title = result.prompt?.title ?? `Prompt #${result.prompt_id}`;
              return (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => onSelectResult(result.id)}
                  className={`flex w-full flex-col gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${
                    isActive ? "border-slate-300 bg-white shadow-sm" : "bg-background hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-foreground">{title}</div>
                      <div className="text-xs text-muted-foreground">
                        Bijgewerkt: {formatDate(result.updated_at)}
                      </div>
                    </div>
                    <span className={`mt-1 inline-flex size-2 rounded-full ${promptStatusDotClass(result.status)}`} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-1 font-semibold ${promptStatusClass(result.status)}`}>
                      {formatPromptStatus(result.status)}
                    </span>
                    {result.error && <span className="text-destructive">Fout</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
