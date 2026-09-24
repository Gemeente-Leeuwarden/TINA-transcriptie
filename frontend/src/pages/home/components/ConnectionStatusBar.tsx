import { Mic, MicOff, Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusBarProps {
  connected: boolean;
  micStatus: "active" | "paused" | "off";
}

export function ConnectionStatusBar({ connected, micStatus }: ConnectionStatusBarProps) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {connected ? (
          <Wifi className="size-3.5 text-emerald-500" />
        ) : (
          <WifiOff className="size-3.5 text-muted-foreground" />
        )}
        <span>{connected ? "Verbonden" : "Niet verbonden"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {micStatus === "active" ? (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
          </span>
        ) : (
          <span
            className={`inline-flex size-2 rounded-full ${
              micStatus === "paused" ? "bg-amber-400" : "bg-muted-foreground/50"
            }`}
          />
        )}
        {micStatus === "active" ? (
          <Mic className="size-3.5 text-rose-500" />
        ) : (
          <MicOff className="size-3.5 text-muted-foreground" />
        )}
        <span>
          {micStatus === "active"
            ? "Microfoon actief"
            : micStatus === "paused"
              ? "Microfoon gepauzeerd"
              : "Microfoon uit"}
        </span>
      </div>
    </div>
  );
}
