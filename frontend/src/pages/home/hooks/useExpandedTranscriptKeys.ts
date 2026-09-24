import { useCallback, useEffect, useState } from "react";

export function useExpandedTranscriptKeys(sessionId: number | null) {
  const [expandedTranscriptKeys, setExpandedTranscriptKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedTranscriptKeys(new Set());
  }, [sessionId]);

  const toggleExpandedTranscript = useCallback((entryKey: string) => {
    setExpandedTranscriptKeys((prev) => {
      const next = new Set(prev);
      if (next.has(entryKey)) {
        next.delete(entryKey);
      } else {
        next.add(entryKey);
      }
      return next;
    });
  }, []);

  return {
    expandedTranscriptKeys,
    toggleExpandedTranscript,
  };
}
