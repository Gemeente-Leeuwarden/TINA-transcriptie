import type { ActiveSessionSummaryApi, SegmentTimelineItem } from "@/contexts/session/types";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    return `${fallback}: ${(data as { error: string }).error}`;
  }
  return fallback;
}

export async function fetchActiveSessionsApi(token: string): Promise<ActiveSessionSummaryApi[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/active`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, `Actieve sessies laden mislukt (${res.status})`));
  }
  const data = (await res.json()) as { sessions?: ActiveSessionSummaryApi[] };
  return data.sessions ?? [];
}

export async function fetchSessionSegmentsApi(token: string, sessionId: number): Promise<SegmentTimelineItem[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/segments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Segmenten laden mislukt (${res.status})`);
  }
  const data = (await res.json()) as { segments?: SegmentTimelineItem[] };
  return data.segments ?? [];
}
