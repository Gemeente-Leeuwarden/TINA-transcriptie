import { useEffect, useState } from "react";
import { fetchPagedSessionsApi } from "@/pages/session-overview/api";
import type { PastSession } from "@/pages/session-overview/types";

const PAGE_SIZE = 6;

type Side = "owner" | "guest";

type BucketState = {
  sessions: PastSession[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
};

function useSessionBucket(token: string | null | undefined, side: Side) {
  const [state, setState] = useState<BucketState>({
    sessions: [],
    loading: false,
    error: null,
    page: 1,
    totalPages: 1,
  });

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    (async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { sessions, totalPages } = await fetchPagedSessionsApi(
          token,
          side,
          state.page,
          PAGE_SIZE,
          controller.signal
        );

        setState((prev) => ({
          ...prev,
          sessions,
          totalPages,
        }));
      } catch (err) {
        if (!controller.signal.aborted) {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : "Sessies laden mislukt",
          }));
        }
      } finally {
        if (!controller.signal.aborted) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    })();

    return () => controller.abort();
  }, [token, side, state.page]);

  return {
    ...state,
    setPage: (updater: (previous: number) => number) => {
      setState((prev) => ({ ...prev, page: updater(prev.page) }));
    },
  };
}

export function useSessionBuckets(token: string | null | undefined) {
  const owned = useSessionBucket(token, "owner");
  const guest = useSessionBucket(token, "guest");

  return {
    owned,
    guest,
  };
}
