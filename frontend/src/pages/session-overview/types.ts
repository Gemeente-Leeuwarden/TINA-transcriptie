import type { PurposeSummary } from "@/lib/purpose";

export type PastSessionApi = {
  session_id: number;
  status: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export type PastSession = {
  sessionId: number;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionDetailSummary = {
  sessionId: number;
  status: string;
  role: string;
  transcription: string;
  createdAt: string;
  updatedAt: string;
  files: string[];
  purpose?: PurposeSummary | null;
};

export type SessionMember = {
  userId: number;
  email: string;
  role: string;
};

export type PaginationInfo = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};
