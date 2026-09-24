export type PurposeLimitations = {
  inviteParticipants: boolean;
  allowAppRecording: boolean;
};

export type PurposePrompt = {
  id: number;
  title: string;
};

export type PurposeSummary = {
  id: number;
  title: string;
  description: string;
  promptId: number;
  promptTitle?: string;
  limitations?: PurposeLimitations;
};

export type PurposeApi = {
  id: number;
  title: string;
  description: string;
  prompt_id: number;
  prompt?: PurposePrompt;
  limitations?: {
    invite_participants: boolean;
    allow_app_recording: boolean;
  };
};

export function mapPurpose(api: PurposeApi): PurposeSummary {
  return {
    id: api.id,
    title: api.title,
    description: api.description,
    promptId: api.prompt_id,
    promptTitle: api.prompt?.title,
    limitations: api.limitations
      ? {
          inviteParticipants: api.limitations.invite_participants,
          allowAppRecording: api.limitations.allow_app_recording,
        }
      : undefined,
  };
}

export function isInviteAllowed(purpose?: PurposeSummary | null): boolean {
  return purpose?.limitations?.inviteParticipants ?? true;
}

export function isAppRecordingAllowed(purpose?: PurposeSummary | null): boolean {
  return purpose?.limitations?.allowAppRecording ?? true;
}
