import { parseApiError } from "@/lib/formatters";
import { mapPurpose, type PurposeApi } from "@/lib/purpose";
import type {
  PromptOption,
  PromptResultItem,
  SegmentTimelineItem,
  SessionDetail,
  SessionMember,
} from "@/pages/session-detail/types";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchSessionDetailApi(token: string, sessionId: number): Promise<SessionDetail> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error("Sessie laden mislukt");
  }

  const data = (await res.json()) as {
    session_id: number;
    status: string;
    role: string;
    transcription: string;
    transcript_lines?: {
      sequence: number;
      speaker: string;
      start_ms: number;
      end_ms: number;
      text: string;
    }[];
    speaker_names?: Record<string, string>;
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
    transcriptLines: data.transcript_lines ?? [],
    speakerNames: data.speaker_names ?? {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    files: data.files ?? [],
    purpose: data.purpose ? mapPurpose(data.purpose) : null,
  };
}

export async function fetchSessionSegmentsApi(token: string, sessionId: number): Promise<SegmentTimelineItem[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/segments`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as { segments?: SegmentTimelineItem[] };
  return data.segments ?? [];
}

export async function fetchSessionMembersApi(token: string, sessionId: number): Promise<SessionMember[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/members`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error("Leden laden mislukt");
  }

  const data = (await res.json()) as {
    members?: { user_id: number; email: string; role: string }[];
  };
  return (data.members ?? []).map((member) => ({
    userId: member.user_id,
    email: member.email,
    role: member.role,
  }));
}

export async function updateSessionSpeakerNamesApi(
  token: string,
  sessionId: number,
  speakerNames: Record<string, string>
): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/speakers`, {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ speaker_names: speakerNames }),
  });
  if (!res.ok) {
    throw new Error("Sprekers bijwerken mislukt");
  }
}

export async function removeSessionMemberApi(token: string, sessionId: number, userId: number): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/members/${userId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Deelnemer verwijderen mislukt");
  }
}

export async function fetchSessionPromptResultsApi(token: string, sessionId: number): Promise<PromptResultItem[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/prompts`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(parseApiError(data, "Promptresultaten laden mislukt"));
  }
  const data = (await res.json()) as { results?: PromptResultItem[] };
  return data.results ?? [];
}

export async function fetchPromptOptionsApi(token: string): Promise<PromptOption[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/prompts`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(parseApiError(data, "Prompts laden mislukt"));
  }
  const data = (await res.json()) as { prompts?: PromptOption[] };
  return data.prompts ?? [];
}

export async function applySessionPromptApi(token: string, sessionId: number, promptId: number): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/prompts`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt_id: promptId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(parseApiError(data, "Prompt toepassen mislukt"));
  }
}

export async function deleteSessionPromptResultApi(
  token: string,
  sessionId: number,
  resultId: number
): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/sessions/${sessionId}/prompts/${resultId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(parseApiError(data, "Promptresultaat verwijderen mislukt"));
  }
}
