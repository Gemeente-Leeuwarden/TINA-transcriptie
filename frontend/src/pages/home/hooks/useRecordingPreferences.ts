import { useEffect, useState } from "react";

type SessionSnapshot = {
  isRecording: boolean;
  status: string | null;
  sessionId: number | null;
};

type UseRecordingPreferencesParams = {
  session: SessionSnapshot;
  hasAudioCapture: boolean;
  appRecordingAllowed: boolean;
};

export function useRecordingPreferences({
  session,
  hasAudioCapture,
  appRecordingAllowed,
}: UseRecordingPreferencesParams) {
  const [reloadSessionId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem("capture.appReloadSessionId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  });

  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isReload, setIsReload] = useState(false);
  const [micEnabled, setMicEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem("capture.micEnabled");
    return raw ? raw === "true" : true;
  });
  const [appEnabled, setAppEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem("capture.appEnabled");
    return raw ? raw === "true" : false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("capture.micEnabled", String(micEnabled));
    window.localStorage.setItem("capture.appEnabled", String(appEnabled));
  }, [micEnabled, appEnabled]);

  useEffect(() => {
    if (!appRecordingAllowed && appEnabled) {
      setAppEnabled(false);
    }
  }, [appEnabled, appRecordingAllowed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (nav?.type === "reload") {
      setIsReload(true);
    }
  }, []);

  useEffect(() => {
    if (!session.isRecording || session.status !== "recording") {
      setSessionStartMs(null);
      return;
    }
    setSessionStartMs((prev) => prev ?? Date.now());
  }, [session.isRecording, session.sessionId, session.status]);

  useEffect(() => {
    if (sessionStartMs == null) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionStartMs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      if (session.isRecording && session.status === "recording" && appEnabled && session.sessionId) {
        window.sessionStorage.setItem("capture.appReloadSessionId", String(session.sessionId));
      } else {
        window.sessionStorage.removeItem("capture.appReloadSessionId");
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [session.isRecording, session.sessionId, session.status, appEnabled]);

  const showReloadBanner =
    session.isRecording &&
    session.status === "recording" &&
    appEnabled &&
    !hasAudioCapture &&
    isReload &&
    reloadSessionId != null &&
    reloadSessionId === session.sessionId;

  return {
    micEnabled,
    appEnabled,
    sessionStartMs,
    nowMs,
    showReloadBanner,
    setMicEnabled,
    setAppEnabled,
  };
}
