import { useEffect, useState } from "react";
import type { PurposeSummary } from "@/lib/purpose";
import { fetchPurposesApi } from "@/pages/session-upload/api";

export function useUploadPurposes(token: string | null | undefined) {
  const [purposes, setPurposes] = useState<PurposeSummary[]>([]);
  const [purposeError, setPurposeError] = useState<string | null>(null);
  const [purposeLoading, setPurposeLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    (async () => {
      setPurposeLoading(true);
      setPurposeError(null);
      try {
        const loadedPurposes = await fetchPurposesApi(token);
        if (!controller.signal.aborted) {
          setPurposes(loadedPurposes);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setPurposeError(err instanceof Error ? err.message : "Doelen laden mislukt");
        }
      } finally {
        if (!controller.signal.aborted) {
          setPurposeLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [token]);

  return {
    purposes,
    purposeError,
    purposeLoading,
  };
}
