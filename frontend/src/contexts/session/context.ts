import { createContext } from "react";
import type { SessionContextValue } from "@/contexts/session/types";

export const SessionContext = createContext<SessionContextValue | null>(null);
