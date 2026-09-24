import type { ReactNode } from "react";
import { SessionContext } from "@/contexts/session/context";
import { useSessionProviderValue } from "@/contexts/session/useSessionProviderValue";

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionProviderValue();
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
