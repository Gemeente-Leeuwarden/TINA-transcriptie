import { type Dispatch, type FormEvent, type SetStateAction, useCallback, useEffect, useState } from "react";
import {
  createPurposeApi,
  deletePurposeApi,
  fetchPurposeListApi,
  fetchPurposePromptOptionsApi,
  type PurposeMutationPayload,
  updatePurposeApi,
} from "@/pages/admin/api";
import type { AdminPurposeItem, PurposePromptOption } from "@/pages/admin/types";
import type { PurposeFormState } from "@/pages/admin/components/PurposeForm";

export const DEFAULT_PURPOSE_FORM: PurposeFormState = {
  title: "",
  description: "",
  promptId: null,
  inviteParticipants: true,
  allowAppRecording: true,
  audioHours: 0,
  transcriptionHours: 0,
  promptsHours: 0,
};

function sanitizeHours(value: number): number {
  return Math.max(0, Math.floor(value));
}

function toPayload(form: PurposeFormState): PurposeMutationPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    prompt_id: form.promptId ?? 0,
    limitations: {
      invite_participants: form.inviteParticipants,
      allow_app_recording: form.allowAppRecording,
    },
    retention: {
      audio_hours: sanitizeHours(form.audioHours),
      transcription_hours: sanitizeHours(form.transcriptionHours),
      prompts_hours: sanitizeHours(form.promptsHours),
    },
  };
}

interface UseAdminPurposesParams {
  token: string | null;
}

interface UseAdminPurposesResult {
  purposeForm: PurposeFormState;
  setPurposeForm: Dispatch<SetStateAction<PurposeFormState>>;
  purposePromptOptions: PurposePromptOption[];
  purposePromptError: string | null;
  isLoadingPurposePrompts: boolean;
  purposeNotice: string | null;
  purposeError: string | null;
  isCreatingPurpose: boolean;
  purposeItems: AdminPurposeItem[];
  purposeListError: string | null;
  isLoadingPurposes: boolean;
  editingPurposeId: number | null;
  editForm: PurposeFormState;
  setEditForm: Dispatch<SetStateAction<PurposeFormState>>;
  savingPurposeId: number | null;
  deletingPurposeId: number | null;
  refreshPurposeList: () => Promise<void>;
  createPurpose: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  beginEditPurpose: (purpose: AdminPurposeItem) => void;
  cancelEditPurpose: () => void;
  updatePurpose: (purposeId: number) => Promise<void>;
  deletePurpose: (purposeId: number) => Promise<void>;
}

export function useAdminPurposes({ token }: UseAdminPurposesParams): UseAdminPurposesResult {
  const [purposeForm, setPurposeForm] = useState<PurposeFormState>(DEFAULT_PURPOSE_FORM);
  const [purposePromptOptions, setPurposePromptOptions] = useState<PurposePromptOption[]>([]);
  const [purposePromptError, setPurposePromptError] = useState<string | null>(null);
  const [isLoadingPurposePrompts, setIsLoadingPurposePrompts] = useState(false);

  const [purposeNotice, setPurposeNotice] = useState<string | null>(null);
  const [purposeError, setPurposeError] = useState<string | null>(null);
  const [isCreatingPurpose, setIsCreatingPurpose] = useState(false);

  const [purposeItems, setPurposeItems] = useState<AdminPurposeItem[]>([]);
  const [purposeListError, setPurposeListError] = useState<string | null>(null);
  const [isLoadingPurposes, setIsLoadingPurposes] = useState(false);

  const [editingPurposeId, setEditingPurposeId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PurposeFormState>(DEFAULT_PURPOSE_FORM);
  const [savingPurposeId, setSavingPurposeId] = useState<number | null>(null);
  const [deletingPurposeId, setDeletingPurposeId] = useState<number | null>(null);

  const fetchPurposePromptOptions = useCallback(async () => {
    if (!token) return;
    setIsLoadingPurposePrompts(true);
    setPurposePromptError(null);
    try {
      const options = await fetchPurposePromptOptionsApi(token);
      setPurposePromptOptions(options);
    } catch (err) {
      setPurposePromptError(err instanceof Error ? err.message : "Prompt lijst laden mislukt");
    } finally {
      setIsLoadingPurposePrompts(false);
    }
  }, [token]);

  const refreshPurposeList = useCallback(async () => {
    if (!token) return;
    setIsLoadingPurposes(true);
    setPurposeListError(null);
    try {
      const purposes = await fetchPurposeListApi(token);
      setPurposeItems(purposes);
    } catch (err) {
      setPurposeListError(err instanceof Error ? err.message : "Doelen laden mislukt");
    } finally {
      setIsLoadingPurposes(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void fetchPurposePromptOptions();
    void refreshPurposeList();
  }, [fetchPurposePromptOptions, refreshPurposeList, token]);

  const createPurpose = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!token) return;

      setPurposeNotice(null);
      setPurposeError(null);

      if (!purposeForm.title.trim() || !purposeForm.description.trim()) {
        setPurposeError("Titel en omschrijving zijn verplicht");
        return;
      }
      if (!purposeForm.promptId) {
        setPurposeError("Selecteer een prompt");
        return;
      }

      setIsCreatingPurpose(true);
      try {
        await createPurposeApi(token, toPayload(purposeForm));
        setPurposeNotice("Doel aangemaakt.");
        setPurposeForm(DEFAULT_PURPOSE_FORM);
        await refreshPurposeList();
      } catch (err) {
        setPurposeError(err instanceof Error ? err.message : "Doel aanmaken mislukt");
      } finally {
        setIsCreatingPurpose(false);
      }
    },
    [purposeForm, refreshPurposeList, token]
  );

  const beginEditPurpose = useCallback((purpose: AdminPurposeItem) => {
    setPurposeListError(null);
    setPurposeNotice(null);
    setEditingPurposeId(purpose.id);
    setEditForm({
      title: purpose.title,
      description: purpose.description,
      promptId: purpose.prompt_id ?? purpose.prompt?.id ?? null,
      inviteParticipants: purpose.limitations?.invite_participants ?? true,
      allowAppRecording: purpose.limitations?.allow_app_recording ?? true,
      audioHours: purpose.retention?.audio_hours ?? 0,
      transcriptionHours: purpose.retention?.transcription_hours ?? 0,
      promptsHours: purpose.retention?.prompts_hours ?? 0,
    });
  }, []);

  const cancelEditPurpose = useCallback(() => {
    if (savingPurposeId != null) return;
    setEditingPurposeId(null);
    setEditForm(DEFAULT_PURPOSE_FORM);
  }, [savingPurposeId]);

  const updatePurpose = useCallback(
    async (purposeId: number) => {
      if (!token) return;
      setPurposeListError(null);
      setPurposeNotice(null);

      if (!editForm.title.trim() || !editForm.description.trim()) {
        setPurposeListError("Titel en omschrijving zijn verplicht");
        return;
      }
      if (!editForm.promptId) {
        setPurposeListError("Selecteer een prompt");
        return;
      }

      setSavingPurposeId(purposeId);
      try {
        await updatePurposeApi(token, purposeId, toPayload(editForm));
        setPurposeNotice("Doel bijgewerkt.");
        setEditingPurposeId(null);
        setEditForm(DEFAULT_PURPOSE_FORM);
        await refreshPurposeList();
      } catch (err) {
        setPurposeListError(err instanceof Error ? err.message : "Doel bijwerken mislukt");
      } finally {
        setSavingPurposeId(null);
      }
    },
    [editForm, refreshPurposeList, token]
  );

  const deletePurpose = useCallback(
    async (purposeId: number) => {
      if (!token) return;
      if (!window.confirm("Weet je zeker dat je dit doel wilt verwijderen?")) {
        return;
      }

      setPurposeListError(null);
      setPurposeNotice(null);
      setDeletingPurposeId(purposeId);
      try {
        await deletePurposeApi(token, purposeId);
        setPurposeNotice("Doel verwijderd.");
        if (editingPurposeId === purposeId) {
          setEditingPurposeId(null);
          setEditForm(DEFAULT_PURPOSE_FORM);
        }
        await refreshPurposeList();
      } catch (err) {
        setPurposeListError(err instanceof Error ? err.message : "Doel verwijderen mislukt");
      } finally {
        setDeletingPurposeId(null);
      }
    },
    [editingPurposeId, refreshPurposeList, token]
  );

  return {
    purposeForm,
    setPurposeForm,
    purposePromptOptions,
    purposePromptError,
    isLoadingPurposePrompts,
    purposeNotice,
    purposeError,
    isCreatingPurpose,
    purposeItems,
    purposeListError,
    isLoadingPurposes,
    editingPurposeId,
    editForm,
    setEditForm,
    savingPurposeId,
    deletingPurposeId,
    refreshPurposeList,
    createPurpose,
    beginEditPurpose,
    cancelEditPurpose,
    updatePurpose,
    deletePurpose,
  };
}
