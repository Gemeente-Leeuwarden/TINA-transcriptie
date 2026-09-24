import { useCallback } from "react";
import { useSessionChannelHandlers } from "@/contexts/session/event-handlers/useSessionChannelHandlers";
import { useUserChannelHandlers } from "@/contexts/session/event-handlers/useUserChannelHandlers";
import type { SessionEventHandlersParams } from "@/contexts/session/event-handlers/types";

export function useSessionEventHandlers(params: SessionEventHandlersParams): {
  handlePublication: (msg: Record<string, unknown>) => void;
  handleUserPublication: (msg: Record<string, unknown>) => void;
} {
  const sessionEventHandlers = useSessionChannelHandlers(params);
  const userEventHandlers = useUserChannelHandlers(params);

  const handlePublication = useCallback(
    (msg: Record<string, unknown>) => {
      const eventType = typeof msg.type === "string" ? msg.type : "";
      const handler = sessionEventHandlers[eventType as keyof typeof sessionEventHandlers];
      if (handler) {
        handler(msg);
      }
    },
    [sessionEventHandlers]
  );

  const handleUserPublication = useCallback(
    (msg: Record<string, unknown>) => {
      const eventType = typeof msg.type === "string" ? msg.type : "";
      const handler = userEventHandlers[eventType as keyof typeof userEventHandlers];
      if (handler) {
        handler(msg);
      }
    },
    [userEventHandlers]
  );

  return {
    handlePublication,
    handleUserPublication,
  };
}
