import type { ManagedUserItem } from "@/pages/admin/types";

export function summarizePrompt(content: string): string {
  if (content.length <= 220) return content;
  return `${content.slice(0, 220)}...`;
}

export function sourceLabel(source: ManagedUserItem["source"]): string {
  if (source === "local") return "Lokaal";
  if (source === "azure") return "Azure";
  return source;
}

export function buildPaginationButtons(page: number, totalPages: number): number[] {
  if (totalPages <= 0) return [];

  let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }

  const out: number[] = [];
  for (let i = start; i <= end; i += 1) {
    out.push(i);
  }
  return out;
}
