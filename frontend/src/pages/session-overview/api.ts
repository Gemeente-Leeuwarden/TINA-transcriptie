import { mapPurpose, type PurposeApi } from "@/lib/purpose";
import type {
  PaginationInfo,
  PastSession,
  PastSessionApi,
  SessionDetailSummary,
  SessionMember,
} from "@/pages/session-overview/types";

async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => null);
  throw new Error(data?.error ?? fallback);
}

export async function fetchPagedSessionsApi(
  token: string,
  role: "owner" | "guest",
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<{ sessions: PastSession[]; totalPages: number }> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/sessions/history?page=${page}&page_size=${pageSize}&role=${role}`,
    { headers: { Authorization: `Bearer ${token}` }, signal }
  );
  await ensureOk(res, "Sessies laden mislukt");
  const data = (await res.json()) as {
    sessions?: PastSessionApi[];
    pagination?: PaginationInfo;
  };
  const mapped = (data.sessions ?? []).map((session) => ({
    sessionId: session.session_id,
    status: session.status,
    role: session.role,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  }));
  return {
    sessions: mapped,
    totalPages: data.pagination?.total_pages ?? 1,
  };
}

export async function fetchSessionDetailApi(
  token: string,
  sessionID: number
): Promise<SessionDetailSummary> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(res, "Sessie laden mislukt");
  const data = (await res.json()) as {
    session_id: number;
    status: string;
    role: string;
    transcription: string;
    created_at: string;
    updated_at: string;
    files?: string[];
    purpose?: PurposeApi;
  };
  return {
    sessionId: data.session_id,
    status: data.status,
    role: data.role,
    transcription: data.transcription ?? "",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    files: data.files ?? [],
    purpose: data.purpose ? mapPurpose(data.purpose) : null,
  };
}

export async function fetchSessionMembersApi(
  token: string,
  sessionID: number
): Promise<SessionMember[]> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionID}/members`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  await ensureOk(res, "Leden laden mislukt");
  const data = (await res.json()) as { members?: { user_id: number; email: string; role: string }[] };
  return (data.members ?? []).map((member) => ({
    userId: member.user_id,
    email: member.email,
    role: member.role,
  }));
}

export async function fetchOnlineUsersApi(token: string): Promise<number[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/users/online`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { user_ids?: number[] };
  return data.user_ids ?? [];
}

export async function removeSessionMemberApi(
  token: string,
  sessionID: number,
  userID: number
): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionID}/members/${userID}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  await ensureOk(res, "Deelnemer verwijderen mislukt");
}
