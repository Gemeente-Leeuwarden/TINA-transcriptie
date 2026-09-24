import { useEffect, useMemo, useState } from "react";
import { fetchSessionMembersApi } from "@/pages/session-upload/api";
import type { SessionMember } from "@/pages/session-upload/types";

export function useSessionMembersData(token: string | null | undefined, sessionId: number | null) {
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  useEffect(() => {
    if (!token || !sessionId) return;

    const authToken = token;
    const currentSessionId = sessionId;
    let cancelled = false;

    async function fetchMembers() {
      setIsMembersLoading(true);
      setMembersError(null);
      try {
        const loadedMembers = await fetchSessionMembersApi(authToken, currentSessionId);
        if (!cancelled) {
          setMembers(loadedMembers);
        }
      } catch (err) {
        if (!cancelled) {
          setMembersError(err instanceof Error ? err.message : "Leden laden mislukt");
        }
      } finally {
        if (!cancelled) {
          setIsMembersLoading(false);
        }
      }
    }

    void fetchMembers();
    return () => {
      cancelled = true;
    };
  }, [token, sessionId]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;
      return a.email.localeCompare(b.email);
    });
  }, [members]);

  return {
    members,
    sortedMembers,
    membersError,
    isMembersLoading,
    setMembers,
    setMembersError,
  };
}
