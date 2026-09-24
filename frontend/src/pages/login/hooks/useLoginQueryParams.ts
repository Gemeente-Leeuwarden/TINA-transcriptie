import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

type UseLoginQueryParamsParams = {
  login: (token: string) => void;
  onError: (message: string) => void;
};

export function useLoginQueryParams({ login, onError }: UseLoginQueryParamsParams) {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const errorParam = params.get("error");

    if (token) {
      login(token);
      params.delete("token");
      params.delete("error");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
      navigate("/", { replace: true });
      return;
    }

    if (errorParam) {
      onError(errorParam);
      params.delete("error");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [login, navigate, onError]);
}
