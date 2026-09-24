import type { NotificationType } from "@/contexts/session/types";

export const normalizeNotificationType = (value: unknown): NotificationType => {
  if (value === "good" || value === "warning" || value === "bad") return value;
  return "good";
};

export function decodeCentrifugeData<T>(data: unknown): T {
  if (data instanceof Uint8Array) {
    return JSON.parse(new TextDecoder().decode(data)) as T;
  }
  return data as T;
}
