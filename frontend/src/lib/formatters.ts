export function formatRole(role: string): string {
  if (role === "owner") return "Eigenaar";
  if (role === "editor") return "Moderator";
  if (role === "viewer") return "Gast";
  return role;
}

export function formatStatus(status: string): string {
  if (status === "finished") return "Beeindigd";
  if (status === "transcribing") return "Transcriberen";
  if (status === "error") return "Fout";
  if (status === "new") return "Nieuw";
  if (status === "recording") return "Opnemen";
  return status;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatTitleDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

export function formatDuration(startValue: string, endValue: string): string {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "Onbekend";
  const totalSeconds = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 1000)
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatTimestamp(value?: number): string {
  if (!value || value < 0) return "";
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function parseApiError(data: unknown, fallback: string): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const errVal = (data as { error?: unknown }).error;
    if (typeof errVal === "string") return errVal;
    if (errVal && typeof errVal === "object") {
      const msg = (errVal as { message?: unknown }).message;
      if (typeof msg === "string") return msg;
    }
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
}