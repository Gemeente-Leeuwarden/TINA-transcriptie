import { parseApiError } from "@/lib/formatters";
import type { PromptItem } from "@/pages/control-panel/types";

async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => null);
  throw new Error(parseApiError(data, fallback));
}

export async function changePasswordApi(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/local/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  await ensureOk(res, "Wachtwoord wijzigen mislukt");
}

export async function fetchPromptsApi(token: string): Promise<PromptItem[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/prompts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(res, "Prompts laden mislukt");
  const data = (await res.json()) as { prompts?: PromptItem[] };
  return data.prompts ?? [];
}

export async function createPromptApi(
  token: string,
  payload: { title: string; content: string; is_global: boolean }
): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/prompts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(res, "Prompt aanmaken mislukt");
}

export async function updatePromptApi(
  token: string,
  promptID: number,
  payload: { title: string; content: string; is_global: boolean }
): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/prompts/${promptID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  await ensureOk(res, "Prompt bijwerken mislukt");
}

export async function deletePromptApi(token: string, promptID: number): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/prompts/${promptID}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureOk(res, "Prompt verwijderen mislukt");
}
