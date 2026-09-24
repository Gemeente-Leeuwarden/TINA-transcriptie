export interface PromptItem {
  id: number;
  title: string;
  content: string;
  user_id: number;
  is_global: boolean;
  is_owner: boolean;
  can_manage: boolean;
  created_at: string;
  updated_at: string;
}
