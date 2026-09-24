import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  applySessionPromptApi,
  deleteSessionPromptResultApi,
  fetchPromptOptionsApi,
  fetchSessionPromptResultsApi,
} from "@/pages/session-detail/api";
import type { PromptOption, PromptResultItem } from "@/pages/session-detail/types";

interface UseSessionDetailPromptsParams {
  token: string | null;
  sessionId: number;
  canApplyPrompts: boolean;
  isSessionFinished: boolean;
}

interface UseSessionDetailPromptsResult {
  promptResults: PromptResultItem[];
  isPromptResultsLoading: boolean;
  promptResultsError: string | null;
  deletePromptError: string | null;
  promptOptions: PromptOption[];
  isPromptOptionsLoading: boolean;
  promptOptionsError: string | null;
  selectedPromptId: number | "";
  isApplyingPrompt: boolean;
  applyPromptError: string | null;
  applyPromptNotice: string | null;
  deletingPromptResultId: number | null;
  activePromptResultId: number | null;
  activePromptResult: PromptResultItem | null;
  promptSelectValue: number | "";
  setSelectedPromptId: (value: number | "") => void;
  setActivePromptResultId: (value: number | null) => void;
  refreshPromptResults: () => Promise<void>;
  applyPrompt: (event: FormEvent<Element>) => Promise<void>;
  deletePromptResult: (resultId: number) => Promise<void>;
}

export function useSessionDetailPrompts({
  token,
  sessionId,
  canApplyPrompts,
  isSessionFinished,
}: UseSessionDetailPromptsParams): UseSessionDetailPromptsResult {
  const [promptResults, setPromptResults] = useState<PromptResultItem[]>([]);
  const [isPromptResultsLoading, setIsPromptResultsLoading] = useState(false);
  const [promptResultsError, setPromptResultsError] = useState<string | null>(null);
  const [deletePromptError, setDeletePromptError] = useState<string | null>(null);

  const [promptOptions, setPromptOptions] = useState<PromptOption[]>([]);
  const [isPromptOptionsLoading, setIsPromptOptionsLoading] = useState(false);
  const [promptOptionsError, setPromptOptionsError] = useState<string | null>(null);

  const [selectedPromptId, setSelectedPromptId] = useState<number | "">("");
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false);
  const [applyPromptError, setApplyPromptError] = useState<string | null>(null);
  const [applyPromptNotice, setApplyPromptNotice] = useState<string | null>(null);
  const [deletingPromptResultId, setDeletingPromptResultId] = useState<number | null>(null);
  const [activePromptResultId, setActivePromptResultId] = useState<number | null>(null);

  const refreshPromptResults = useCallback(async () => {
    if (!token || !sessionId) {
      setPromptResults([]);
      return;
    }

    setIsPromptResultsLoading(true);
    setPromptResultsError(null);
    setDeletePromptError(null);
    try {
      const results = await fetchSessionPromptResultsApi(token, sessionId);
      setPromptResults(results);
    } catch (err) {
      setPromptResultsError(err instanceof Error ? err.message : "Promptresultaten laden mislukt");
    } finally {
      setIsPromptResultsLoading(false);
    }
  }, [token, sessionId]);

  const refreshPromptOptions = useCallback(async () => {
    if (!token) {
      setPromptOptions([]);
      return;
    }

    setIsPromptOptionsLoading(true);
    setPromptOptionsError(null);
    try {
      const options = await fetchPromptOptionsApi(token);
      setPromptOptions(options);
    } catch (err) {
      setPromptOptionsError(err instanceof Error ? err.message : "Prompts laden mislukt");
    } finally {
      setIsPromptOptionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshPromptResults();
  }, [refreshPromptResults]);

  useEffect(() => {
    if (promptResults.length === 0) {
      setActivePromptResultId(null);
      return;
    }
    if (
      activePromptResultId == null ||
      !promptResults.some((promptResult) => promptResult.id === activePromptResultId)
    ) {
      setActivePromptResultId(promptResults[0].id);
    }
  }, [activePromptResultId, promptResults]);

  useEffect(() => {
    if (!token || !canApplyPrompts || !isSessionFinished) {
      setPromptOptions([]);
      setSelectedPromptId("");
      return;
    }
    void refreshPromptOptions();
  }, [token, canApplyPrompts, isSessionFinished, refreshPromptOptions]);

  const activePromptResult = useMemo(() => {
    if (activePromptResultId == null) return null;
    return promptResults.find((promptResult) => promptResult.id === activePromptResultId) ?? null;
  }, [activePromptResultId, promptResults]);

  const promptSelectValue = promptResults.length === 0 ? "" : activePromptResult?.id ?? promptResults[0].id;

  const applyPrompt = useCallback(
    async (event: FormEvent<Element>) => {
      event.preventDefault();
      if (!token || !sessionId) return;
      if (!selectedPromptId) {
        setApplyPromptError("Selecteer een prompt");
        return;
      }

      setIsApplyingPrompt(true);
      setApplyPromptError(null);
      setApplyPromptNotice(null);
      try {
        await applySessionPromptApi(token, sessionId, selectedPromptId);
        setApplyPromptNotice("Prompt is in wachtrij gezet");
        setSelectedPromptId("");
        await refreshPromptResults();
      } catch (err) {
        setApplyPromptError(err instanceof Error ? err.message : "Prompt toepassen mislukt");
      } finally {
        setIsApplyingPrompt(false);
      }
    },
    [token, sessionId, selectedPromptId, refreshPromptResults]
  );

  const deletePromptResult = useCallback(
    async (resultId: number) => {
      if (!token || !sessionId) return;
      if (!window.confirm("Weet je zeker dat je dit promptresultaat wilt verwijderen?")) {
        return;
      }

      setDeletingPromptResultId(resultId);
      setDeletePromptError(null);
      try {
        await deleteSessionPromptResultApi(token, sessionId, resultId);
        setPromptResults((prev) => prev.filter((promptResult) => promptResult.id !== resultId));
        if (activePromptResultId === resultId) {
          setActivePromptResultId(null);
        }
      } catch (err) {
        setDeletePromptError(err instanceof Error ? err.message : "Promptresultaat verwijderen mislukt");
      } finally {
        setDeletingPromptResultId(null);
      }
    },
    [activePromptResultId, sessionId, token]
  );

  return {
    promptResults,
    isPromptResultsLoading,
    promptResultsError,
    deletePromptError,
    promptOptions,
    isPromptOptionsLoading,
    promptOptionsError,
    selectedPromptId,
    isApplyingPrompt,
    applyPromptError,
    applyPromptNotice,
    deletingPromptResultId,
    activePromptResultId,
    activePromptResult,
    promptSelectValue,
    setSelectedPromptId,
    setActivePromptResultId,
    refreshPromptResults,
    applyPrompt,
    deletePromptResult,
  };
}
