import { useEffect } from "react";
import type { SessionActionsSharedParams } from "@/contexts/session/actions/types";

interface UseAutoJoinOwnerSessionParams
  extends Pick<
    SessionActionsSharedParams,
    | "connected"
    | "session"
    | "activeSessions"
    | "autoJoinAttemptedRef"
  > {
  joinSession: (sessionIdOrCode: string | number) => Promise<void>;
}

export function useAutoJoinOwnerSession({
  connected,
  session,
  activeSessions,
  autoJoinAttemptedRef,
  joinSession,
}: UseAutoJoinOwnerSessionParams): void {
  useEffect(() => {
    if (!connected || session.isRecording || session.sessionId) return;
    if (autoJoinAttemptedRef.current || activeSessions.length === 0) return;

    const sorted = [...activeSessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const target = sorted[0];
    if (target.role !== "owner") {
      autoJoinAttemptedRef.current = true;
      return;
    }

    autoJoinAttemptedRef.current = true;
    joinSession(target.sessionId).catch(() => {});
  }, [activeSessions, autoJoinAttemptedRef, connected, joinSession, session.isRecording, session.sessionId]);
}
