import { parseApiError } from "@/lib/formatters";
import type {
  AdminPromptItem,
  AdminPurposeItem,
  PlatformRole,
  ManagedUserItem,
  PromptPagination,
  PurposePromptOption,
  RabbitQueueInfo,
  RabbitQueueMessage,
  UserPagination,
  UserSourceTab,
} from "@/pages/admin/types";

async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => null);
  throw new Error(parseApiError(data, fallback));
}

export interface PurposeMutationPayload {
  title: string;
  description: string;
  prompt_id: number;
  limitations: {
    invite_participants: boolean;
    allow_app_recording: boolean;
  };
  retention: {
    audio_hours: number;
    transcription_hours: number;
    prompts_hours: number;
  };
}

export interface NotifyUsersPayload {
  title: string;
  message: string;
  level: "good" | "warning" | "bad";
  user_ids: number[];
}

export async function fetchPromptPageApi(
  token: string,
  page: number,
  pageSize: number
): Promise<{ prompts: AdminPromptItem[]; pagination?: PromptPagination }> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/prompts/admin?page=${page}&page_size=${pageSize}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  await ensureOk(res, "Prompt overzicht laden mislukt");
  const data = (await res.json()) as {
    prompts?: AdminPromptItem[];
    pagination?: PromptPagination;
  };
  return {
    prompts: data.prompts ?? [],
    pagination: data.pagination,
  };
}

export async function fetchPurposePromptOptionsApi(
  token: string
): Promise<PurposePromptOption[]> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/prompts/admin?page=1&page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  await ensureOk(res, "Prompt lijst laden mislukt");
  const data = (await res.json()) as { prompts?: AdminPromptItem[] };
  return (data.prompts ?? []).map((prompt) => ({
    id: prompt.id,
    title: prompt.title,
  }));
}

export async function fetchPurposeListApi(token: string): Promise<AdminPurposeItem[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/purposes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(res, "Doelen laden mislukt");
  const data = (await res.json()) as { purposes?: AdminPurposeItem[] };
  return data.purposes ?? [];
}

export async function fetchUsersApi(
  token: string,
  source: UserSourceTab,
  page: number,
  pageSize: number
): Promise<{ users: ManagedUserItem[]; pagination?: UserPagination }> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/admin/users?source=${source}&page=${page}&page_size=${pageSize}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  await ensureOk(res, "Gebruikers laden mislukt");
  const data = (await res.json()) as {
    users?: ManagedUserItem[];
    pagination?: UserPagination;
  };
  return {
    users: data.users ?? [],
    pagination: data.pagination,
  };
}

export async function fetchOnlineUsersApi(token: string): Promise<number[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/users/online`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { user_ids?: number[] };
  return data.user_ids ?? [];
}

export async function fetchQueuesApi(token: string): Promise<RabbitQueueInfo[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/rabbitmq/queues`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(res, "Queues laden mislukt");
  const data = (await res.json()) as { queues?: RabbitQueueInfo[] };
  return data.queues ?? [];
}

export async function fetchQueueMessagesApi(
  token: string,
  queueName: string,
  count: number,
  action: "peek" | "drop"
): Promise<RabbitQueueMessage[]> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/admin/rabbitmq/queues/${encodeURIComponent(queueName)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count, action }),
    }
  );
  await ensureOk(
    res,
    action === "peek" ? "Queue items laden mislukt" : "Queue item verwijderen mislukt"
  );
  const data = (await res.json()) as { messages?: RabbitQueueMessage[] };
  return data.messages ?? [];
}

export async function fetchMessageUsersApi(
  token: string,
  page: number,
  search: string
): Promise<{ users: ManagedUserItem[]; totalPages: number }> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "20",
  });
  if (search) params.set("search", search);

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/admin/users?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  await ensureOk(res, "Gebruikers laden mislukt");

  const data = (await res.json()) as {
    users?: ManagedUserItem[];
    pagination?: { total_pages: number };
  };
  return {
    users: data.users ?? [],
    totalPages: data.pagination?.total_pages ?? 0,
  };
}

export async function createLocalAccountApi(
  token: string,
  email: string,
  password: string
): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/auth/local/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password }),
    }
  );
  await ensureOk(res, "Account aanmaken mislukt");
}

export async function updateUserRoleApi(
  token: string,
  userID: number,
  role: PlatformRole
): Promise<ManagedUserItem | null> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/admin/users/${userID}/role`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    }
  );
  await ensureOk(res, "Rol wijzigen mislukt");
  const data = (await res.json()) as { user?: ManagedUserItem };
  return data.user ?? null;
}

export async function createPurposeApi(
  token: string,
  payload: PurposeMutationPayload
): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/purposes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(res, "Doel aanmaken mislukt");
}

export async function updatePurposeApi(
  token: string,
  purposeID: number,
  payload: PurposeMutationPayload
): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/admin/purposes/${purposeID}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  await ensureOk(res, "Doel bijwerken mislukt");
}

export async function deletePurposeApi(token: string, purposeID: number): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/admin/purposes/${purposeID}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  await ensureOk(res, "Doel verwijderen mislukt");
}

export async function executeSessionActionApi(
  token: string,
  sessionID: number,
  action: "retranscribe-segments" | "retranscribe-session" | "segments" | "transcription"
): Promise<{ segmentCount?: number }> {
  const method = action === "segments" || action === "transcription" ? "DELETE" : "POST";
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/admin/sessions/${sessionID}/${action}`,
    {
      method,
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  await ensureOk(res, "Actie uitvoeren mislukt");
  const data = (await res.json().catch(() => null)) as { segment_count?: number } | null;
  return { segmentCount: data?.segment_count };
}

export async function sendAdminNotificationApi(
  token: string,
  payload: NotifyUsersPayload
): Promise<number> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/notify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(res, "Bericht versturen mislukt");
  const data = (await res.json()) as { recipients?: number };
  return data.recipients ?? 0;
}
