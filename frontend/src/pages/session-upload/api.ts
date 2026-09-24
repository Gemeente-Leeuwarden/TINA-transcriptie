import { mapPurpose, type PurposeApi, type PurposeSummary } from "@/lib/purpose";
import type { SessionMember } from "@/pages/session-upload/types";

async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => null);
  throw new Error(data?.error ?? fallback);
}

export async function fetchPurposesApi(token: string): Promise<PurposeSummary[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/purposes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(res, "Doelen laden mislukt");
  const data = (await res.json()) as { purposes?: PurposeApi[] };
  return (data.purposes ?? []).map(mapPurpose);
}

export async function createUploadSessionApi(
  token: string,
  purposeID: number
): Promise<{
  sessionId: number;
  inviteCode: string | null;
  status: string | null;
  sessionPurpose: PurposeSummary | null;
}> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ purpose_id: purposeID }),
  });
  await ensureOk(res, "Sessie aanmaken mislukt");
  const data = (await res.json()) as {
    session_id: number;
    invite_code: string;
    status: string;
    purpose?: PurposeApi;
  };
  return {
    sessionId: data.session_id,
    inviteCode: data.invite_code ?? null,
    status: data.status ?? null,
    sessionPurpose: data.purpose ? mapPurpose(data.purpose) : null,
  };
}

export async function fetchSessionMembersApi(
  token: string,
  sessionID: number
): Promise<SessionMember[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionID}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(res, "Leden laden mislukt");
  const data = (await res.json()) as {
    members?: { user_id: number; email: string; role: string }[];
  };
  return (data.members ?? []).map((member) => ({
    userId: member.user_id,
    email: member.email,
    role: member.role,
  }));
}

export async function finishUploadSessionApi(
  token: string,
  sessionID: number
): Promise<string> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionID}/finish`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  await ensureOk(res, "Sessie afronden mislukt");
  const data = (await res.json()) as { status?: string };
  return data.status ?? "transcribing";
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
