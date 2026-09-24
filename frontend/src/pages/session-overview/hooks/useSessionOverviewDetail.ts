import { type FormEvent, useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/centrifuge";
import { isInviteAllowed } from "@/lib/purpose";
import {
  fetchOnlineUsersApi,
  fetchSessionDetailApi,
  fetchSessionMembersApi,
  removeSessionMemberApi,
} from "@/pages/session-overview/api";
import type { PastSession, SessionDetailSummary, SessionMember } from "@/pages/session-overview/types";

type Side = "owner" | "guest";

type SelectedSession = {
  session: PastSession;
  side: Side;
} | null;

export function useSessionOverviewDetail(token: string | null | undefined, selected: SelectedSession) {
  const [detail, setDetail] = useState<SessionDetailSummary | null>(null);
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [removeBusy, setRemoveBusy] = useState<number | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token || !selected?.session.sessionId) {
      setDetail(null);
      setMembers([]);
      return;
    }

    const authToken = token;
    const sid = selected.session.sessionId;
    let cancelled = false;

    async function fetchDetailAndMembers() {
      setDetailLoading(true);
      setDetailError(null);
      setMembersError(null);
      try {
        const [loadedDetail, loadedMembers] = await Promise.all([
          fetchSessionDetailApi(authToken, sid),
          fetchSessionMembersApi(authToken, sid),
        ]);
        if (!cancelled) {
          setDetail(loadedDetail);
          setMembers(loadedMembers);
        }
      } catch (err) {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : "Sessie laden mislukt");
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void fetchDetailAndMembers();
    return () => {
      cancelled = true;
    };
  }, [token, selected?.session.sessionId]);

  const fetchOnlineUsers = useCallback(async () => {
    if (!token) return;
    try {
      const onlineIDs = await fetchOnlineUsersApi(token);
      setOnlineUserIds(new Set(onlineIDs));
    } catch {
      // ignore transient failures
    }
  }, [token]);

  useEffect(() => {
    if (!selected) return;
    void fetchOnlineUsers();
    const interval = setInterval(() => {
      void fetchOnlineUsers();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers, selected]);

  const canManageMembers = detail != null && (detail.role === "owner" || detail.role === "editor");
  const canInviteMembers = canManageMembers && isInviteAllowed(detail?.purpose ?? null);

  async function inviteMember(event: FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim() || !detail || !token) return;

    setIsInviting(true);
    setMembersError(null);
    try {
      await rpc("session_invite", {
        email: inviteEmail.trim(),
        role: inviteRole,
        session_id: detail.sessionId,
      });
      setInviteEmail("");
      const loadedMembers = await fetchSessionMembersApi(token, detail.sessionId);
      setMembers(loadedMembers);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Uitnodigen mislukt");
    } finally {
      setIsInviting(false);
    }
  }

  async function removeMember(userId: number) {
    if (!token || !detail) return;

    setRemoveBusy(userId);
    setMembersError(null);
    try {
      await removeSessionMemberApi(token, detail.sessionId, userId);
      setMembers((prev) => prev.filter((member) => member.userId !== userId));
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Deelnemer verwijderen mislukt");
    } finally {
      setRemoveBusy(null);
    }
  }

  return {
    detail,
    members,
    detailLoading,
    detailError,
    membersError,
    inviteEmail,
    inviteRole,
    isInviting,
    removeBusy,
    onlineUserIds,
    canManageMembers,
    canInviteMembers,
    setInviteEmail,
    setInviteRole,
    inviteMember,
    removeMember,
  };
}
