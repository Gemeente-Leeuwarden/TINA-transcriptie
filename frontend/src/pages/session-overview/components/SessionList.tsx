import { Loader2 } from "lucide-react";
import { formatDate, formatDuration, formatRole, formatStatus, formatTitleDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PastSession } from "@/pages/session-overview/types";

interface SessionListProps {
  title: string;
  loading: boolean;
  error: string | null;
  sessions: PastSession[];
  page: number;
  totalPages: number;
  emptyText: string;
  onSelect: (session: PastSession) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  showRole?: boolean;
}

export function SessionList({
  title,
  loading,
  error,
  sessions,
  page,
  totalPages,
  emptyText,
  onSelect,
  onPrevPage,
  onNextPage,
  showRole = false,
}: SessionListProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{title}</div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Bezig met laden...
        </div>
      ) : error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={`${title}-${session.sessionId}`}
              type="button"
              onClick={() => onSelect(session)}
              className="w-full text-left rounded-md border px-3 py-2 text-xs transition-all duration-200 hover:border-foreground/40 hover:bg-muted/30"
            >
              <div className="font-medium">
                {formatTitleDate(session.createdAt)} - {formatDuration(session.createdAt, session.updatedAt)}
              </div>
              {showRole ? (
                <div className="text-muted-foreground">Rol: {formatRole(session.role)}</div>
              ) : (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Status: {formatStatus(session.status)}</span>
                  <span>Sessie #{session.sessionId}</span>
                </div>
              )}
              {!showRole && <Separator className="my-2" />}
              {showRole && <div className="text-muted-foreground">Status: {formatStatus(session.status)}</div>}
              <div className="text-muted-foreground">Gestart: {formatDate(session.createdAt)}</div>
              <div className="text-muted-foreground">Laatst bijgewerkt: {formatDate(session.updatedAt)}</div>
            </button>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Button size="sm" variant="ghost" onClick={onPrevPage} disabled={page <= 1}>
                Vorige
              </Button>
              <span>Pagina {page} / {totalPages}</span>
              <Button size="sm" variant="ghost" onClick={onNextPage} disabled={page >= totalPages}>
                Volgende
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
