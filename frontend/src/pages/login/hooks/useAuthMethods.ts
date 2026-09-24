import { useEffect, useState } from "react";

export type AuthMethods = {
  local: boolean;
  azure: boolean;
  registration: boolean;
};

export function useAuthMethods() {
  const [methods, setMethods] = useState<AuthMethods | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMethods() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/methods`);
        if (!res.ok) {
          throw new Error("auth-methoden laden mislukt");
        }

        const data = await res.json();
        if (!cancelled) {
          setMethods({
            local: Boolean(data?.local),
            azure: Boolean(data?.azure),
            registration: Boolean(data?.registration),
          });
        }
      } catch {
        if (!cancelled) {
          setMethods(null);
        }
      }
    }

    void fetchMethods();
    return () => {
      cancelled = true;
    };
  }, []);

  return methods;
}
