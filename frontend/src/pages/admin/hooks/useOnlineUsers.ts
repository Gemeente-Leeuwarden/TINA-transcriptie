import { useCallback, useEffect, useState } from "react";
import { fetchOnlineUsersApi } from "@/pages/admin/api";

export function useOnlineUsers(token: string | null, enabled: boolean): Set<number> {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

  const refreshOnlineUsers = useCallback(async () => {
    if (!token) {
      setOnlineUserIds(new Set());
      return;
    }
    try {
      const userIds = await fetchOnlineUsersApi(token);
      setOnlineUserIds(new Set(userIds));
    } catch {
      // ignore transient online endpoint failures
    }
  }, [token]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const initialRefreshTimeout = setTimeout(() => {
      void refreshOnlineUsers();
    }, 0);
    const interval = setInterval(() => {
      void refreshOnlineUsers();
    }, 30_000);
    return () => {
      clearTimeout(initialRefreshTimeout);
      clearInterval(interval);
    };
  }, [enabled, refreshOnlineUsers]);

  return onlineUserIds;
}
