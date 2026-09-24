import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { rpc } from "@/lib/centrifuge";
import {
  fetchSessionDetailApi,
  fetchSessionMembersApi,
  fetchSessionSegmentsApi,
  removeSessionMemberApi,
  updateSessionSpeakerNamesApi,
} from "@/pages/session-detail/api";
import type { SegmentTimelineItem, SessionDetail, SessionMember } from "@/pages/session-detail/types";

interface UseSessionDetailDataParams {
  token: string | null;
  sessionId: number;
}

interface UseSessionDetailDataResult {
  detail: SessionDetail | null;
  members: SessionMember[];
  sortedMembers: SessionMember[];
  segments: SegmentTimelineItem[];
  isLoading: boolean;
  isMembersLoading: boolean;
  error: string | null;
  membersError: string | null;
  inviteEmail: string;
  inviteRole: "owner" | "editor" | "viewer";
  isInviting: boolean;
  removeBusy: number | null;
  setInviteEmail: (value: string) => void;
  setInviteRole: (value: "owner" | "editor" | "viewer") => void;
  getDisplayName: (speaker: string) => string;
  renameSpeaker: (speaker: string, newName: string) => Promise<void>;
  inviteMember: (event: FormEvent<Element>) => Promise<void>;
  removeMember: (userId: number) => Promise<void>;
}

export function useSessionDetailData({ token, sessionId }: UseSessionDetailDataParams): UseSessionDetailDataResult {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [segments, setSegments] = useState<SegmentTimelineItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [removeBusy, setRemoveBusy] = useState<number | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!token || !sessionId) return;
    setIsMembersLoading(true);
    setMembersError(null);
    try {
      const nextMembers = await fetchSessionMembersApi(token, sessionId);
      setMembers(nextMembers);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Leden laden mislukt");
    } finally {
      setIsMembersLoading(false);
    }
  }, [token, sessionId]);

  useEffect(() => {
    if (!token || !sessionId) return;
    const authToken = token;
    let cancelled = false;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const nextDetail = await fetchSessionDetailApi(authToken, sessionId);
        if (!cancelled) {
          setDetail(nextDetail);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Sessie laden mislukt");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [token, sessionId]);

  useEffect(() => {
    if (!token || !sessionId) return;
    const authToken = token;
    let cancelled = false;

    async function loadSegments() {
      try {
        const nextSegments = await fetchSessionSegmentsApi(authToken, sessionId);
        if (!cancelled) {
          setSegments(nextSegments);
        }
      } catch {
        if (!cancelled) {
          setSegments([]);
        }
      }
    }

    void loadSegments();
    return () => {
      cancelled = true;
    };
  }, [token, sessionId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;
      return a.email.localeCompare(b.email);
    });
  }, [members]);

  const renameSpeaker = useCallback(
    async (speaker: string, newName: string) => {
      if (!token || !sessionId || !detail) return;

      const previousSpeakerNames = detail.speakerNames;
      const updatedSpeakerNames = { ...previousSpeakerNames, [speaker]: newName };
      setDetail((prev) => (prev ? { ...prev, speakerNames: updatedSpeakerNames } : prev));
      try {
        await updateSessionSpeakerNamesApi(token, sessionId, updatedSpeakerNames);
      } catch {
        setDetail((prev) => (prev ? { ...prev, speakerNames: previousSpeakerNames } : prev));
      }
    },
    [token, sessionId, detail]
  );

  const inviteMember = useCallback(
    async (event: FormEvent<Element>) => {
      event.preventDefault();
      if (!inviteEmail.trim() || !sessionId) return;

      setIsInviting(true);
      setMembersError(null);
      try {
        await rpc("session_invite", {
          email: inviteEmail.trim(),
          role: inviteRole,
          session_id: sessionId,
        });
        setInviteEmail("");
        await fetchMembers();
      } catch (err) {
        setMembersError(err instanceof Error ? err.message : "Uitnodigen mislukt");
      } finally {
        setIsInviting(false);
      }
    },
    [fetchMembers, inviteEmail, inviteRole, sessionId]
  );

  const removeMember = useCallback(
    async (userId: number) => {
      if (!token || !sessionId) return;
      setRemoveBusy(userId);
      setMembersError(null);

      try {
        await removeSessionMemberApi(token, sessionId, userId);
        setMembers((prev) => prev.filter((member) => member.userId !== userId));
      } catch (err) {
        setMembersError(err instanceof Error ? err.message : "Deelnemer verwijderen mislukt");
      } finally {
        setRemoveBusy(null);
      }
    },
    [token, sessionId]
  );

  const getDisplayName = useCallback(
    (speaker: string) => {
      return detail?.speakerNames[speaker] || speaker;
    },
    [detail]
  );

  return {
    detail,
    members,
    sortedMembers,
    segments,
    isLoading,
    isMembersLoading,
    error,
    membersError,
    inviteEmail,
    inviteRole,
    isInviting,
    removeBusy,
    setInviteEmail,
    setInviteRole,
    getDisplayName,
    renameSpeaker,
    inviteMember,
    removeMember,
  };
}
