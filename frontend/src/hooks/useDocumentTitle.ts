import { useEffect } from "react";

export function useDocumentTitle(page: string) {
  useEffect(() => {
    document.title = `TINA | ${page}`;
    return () => {
      document.title = "TINA";
    };
  }, [page]);
}
