import { useEffect, useState } from "react";
import { mapPurpose, type PurposeApi, type PurposeSummary } from "@/lib/purpose";

export function useHomePurposes(token: string | null | undefined) {
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
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/purposes`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Doelen laden mislukt");

        const data = (await res.json()) as { purposes?: PurposeApi[] };
        setPurposes((data.purposes ?? []).map(mapPurpose));
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
