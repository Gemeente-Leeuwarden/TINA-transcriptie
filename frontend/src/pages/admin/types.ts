export type AdminTab =
  | "prompts"
  | "purposes"
  | "users"
  | "sessions"
  | "queues"
  | "messages";

export type UserSourceTab = "local" | "azure";
export type PlatformRole = "user" | "admin";

export interface AdminPromptItem {
  id: number;
  title: string;
  content: string;
  user_id: number;
  owner_email: string;
  is_global: boolean;
  is_owner: boolean;
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PurposePromptOption {
  id: number;
  title: string;
}

export interface AdminPurposeItem {
  id: number;
  title: string;
  description: string;
  prompt_id: number;
  prompt?: PurposePromptOption;
  limitations?: {
    invite_participants: boolean;
    allow_app_recording: boolean;
  };
  retention?: {
    audio_hours: number;
    transcription_hours: number;
    prompts_hours: number;
  };
}

export interface ManagedUserItem {
  id: number;
  email: string;
  source: "local" | "azure" | string;
  role: PlatformRole;
  created_at: string;
  updated_at: string;
  is_current_user: boolean;
}

export interface UserPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface RabbitQueueInfo {
  name: string;
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  consumers: number;
}

export interface RabbitQueueMessage {
  payload: unknown;
  payload_encoding: string;
  properties: Record<string, unknown> | null;
  redelivered: boolean;
  routing_key: string;
}
