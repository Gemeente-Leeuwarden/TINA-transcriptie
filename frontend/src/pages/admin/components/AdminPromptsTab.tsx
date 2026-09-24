import { useCallback, useEffect, useState } from "react";
import { Globe, Loader2, Lock, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPromptPageApi } from "@/pages/admin/api";
import { PROMPT_PAGE_SIZE } from "@/pages/admin/constants";
import type { AdminPromptItem } from "@/pages/admin/types";
import { buildPaginationButtons, summarizePrompt } from "@/pages/admin/utils";

interface AdminPromptsTabProps {
  token: string | null;
}

export function AdminPromptsTab({ token }: AdminPromptsTabProps) {
  const [promptItems, setPromptItems] = useState<AdminPromptItem[]>([]);
  const [promptPage, setPromptPage] = useState(1);
  const [promptTotalPages, setPromptTotalPages] = useState(0);
  const [promptTotal, setPromptTotal] = useState(0);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  const pageButtons = buildPaginationButtons(promptPage, promptTotalPages);

  const fetchPromptPage = useCallback(
    async (page: number) => {
      if (!token) return;
      setIsLoadingPrompts(true);
      setPromptError(null);
      try {
        const data = await fetchPromptPageApi(token, page, PROMPT_PAGE_SIZE);
        setPromptItems(data.prompts ?? []);
        setPromptPage(data.pagination?.page ?? page);
        setPromptTotal(data.pagination?.total ?? 0);
        setPromptTotalPages(data.pagination?.total_pages ?? 0);
      } catch (err) {
        setPromptError(err instanceof Error ? err.message : "Prompt overzicht laden mislukt");
      } finally {
        setIsLoadingPrompts(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    void fetchPromptPage(promptPage);
  }, [fetchPromptPage, promptPage, token]);

  return (
    <Card className="border-sky-200/70 bg-sky-50/20">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Prompt overzicht</CardTitle>
          <CardDescription>
            Alle prompts in het systeem met paginering. Totaal: {promptTotal}.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void fetchPromptPage(promptPage)}
          disabled={isLoadingPrompts}
        >
          {isLoadingPrompts ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Vernieuwen
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {promptError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {promptError}
          </div>
        )}

        {isLoadingPrompts ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Prompts laden...
          </div>
        ) : promptItems.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
            Geen prompts gevonden.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {promptItems.map((prompt) => (
                <PromptItemCard key={prompt.id} prompt={prompt} />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-xs text-muted-foreground">
                Pagina {promptPage} van {Math.max(promptTotalPages, 1)} ({promptTotal} prompts)
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPromptPage((prev) => Math.max(1, prev - 1))}
                  disabled={isLoadingPrompts || promptPage <= 1}
                >
                  Vorige
                </Button>
                {pageButtons.map((page) => (
                  <Button
                    key={page}
                    type="button"
                    size="sm"
                    variant={page === promptPage ? "secondary" : "ghost"}
                    onClick={() => setPromptPage(page)}
                    disabled={isLoadingPrompts}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPromptPage((prev) => Math.min(Math.max(promptTotalPages, 1), prev + 1))
                  }
                  disabled={isLoadingPrompts || promptTotalPages === 0 || promptPage >= promptTotalPages}
                >
                  Volgende
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PromptItemCard({ prompt }: { prompt: AdminPromptItem }) {
  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">{prompt.title}</div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          {prompt.is_global ? (
            <>
              <Globe className="size-3" />
              Globaal
            </>
          ) : (
            <>
              <Lock className="size-3" />
              Prive
            </>
          )}
        </span>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
        {summarizePrompt(prompt.content)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>Eigenaar: {prompt.owner_email || `#${prompt.user_id}`}</span>
        <span>Bijgewerkt: {formatDate(prompt.updated_at)}</span>
      </div>
    </div>
  );
}
