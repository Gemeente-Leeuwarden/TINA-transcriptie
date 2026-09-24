import type { PurposeSummary } from "@/lib/purpose";

export type SessionMember = {
  userId: number;
  email: string;
  role: string;
};

export type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "queued" | "error";
  error?: string;
};

export type SessionUploadSummary = {
  sessionId: number | null;
  inviteCode: string | null;
  status: string | null;
  sessionPurpose: PurposeSummary | null;
};
