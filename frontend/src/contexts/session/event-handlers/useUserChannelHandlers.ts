import { useCallback, useMemo } from "react";
import { unsubscribeFromSession } from "@/lib/centrifuge";
import { showNotificationToast } from "@/contexts/session/event-handlers/notification";
import type { EventHandlerMap, SessionEventHandlersParams } from "@/contexts/session/event-handlers/types";

export function useUserChannelHandlers({
  setInvites,
  setRemovedSessionId,
  fetchActiveSessions,
  dismissInvite,
  resetToIdle,
  sessionIdRef,
}: Pick<
  SessionEventHandlersParams,
  | "setInvites"
  | "setRemovedSessionId"
  | "fetchActiveSessions"
  | "dismissInvite"
  | "resetToIdle"
  | "sessionIdRef"
>): EventHandlerMap {
  const handleNotification = useCallback((msg: Record<string, unknown>) => {
    showNotificationToast(msg);
  }, []);

  const handleSessionInvited = useCallback(
    (msg: Record<string, unknown>) => {
      const nextInvite = {
        sessionId: msg.session_id as number,
        inviteCode: msg.invite_code as string,
        inviterEmail: msg.inviter_email as string,
        role: msg.role as string,
        receivedAt: Date.now(),
      };
      setInvites((prev) => {
        const existingIndex = prev.findIndex((invite) => invite.sessionId === nextInvite.sessionId);
        if (existingIndex === -1) {
          return [nextInvite, ...prev];
        }
        const updated = [...prev];
        updated[existingIndex] = nextInvite;
        return updated;
      });
      fetchActiveSessions().catch(() => {});
    },
    [fetchActiveSessions, setInvites]
  );

  const handleActiveSessionsUpdated = useCallback(() => {
    fetchActiveSessions().catch(() => {});
  }, [fetchActiveSessions]);

  const handleUserRemovedFromSession = useCallback(
    (msg: Record<string, unknown>) => {
      const removedId = msg.session_id as number;
      const currentSessionId = sessionIdRef.current;
      if (currentSessionId && removedId === currentSessionId) {
        unsubscribeFromSession(currentSessionId);
        resetToIdle();
      }
      dismissInvite(removedId);
      setRemovedSessionId(removedId);
      fetchActiveSessions().catch(() => {});
    },
    [dismissInvite, fetchActiveSessions, resetToIdle, sessionIdRef, setRemovedSessionId]
  );

  return useMemo(
    () => ({
      session_invited: handleSessionInvited,
      active_sessions_updated: handleActiveSessionsUpdated,
      notification: handleNotification,
      good: handleNotification,
      warning: handleNotification,
      bad: handleNotification,
      notify_user_removal_of_session: handleUserRemovedFromSession,
    }),
    [handleActiveSessionsUpdated, handleNotification, handleSessionInvited, handleUserRemovedFromSession]
  );
}
