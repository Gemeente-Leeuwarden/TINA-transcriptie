import { X } from "lucide-react";

interface ErrorBannerProps {
  error: string;
  onClose: () => void;
}

export function ErrorBanner({ error, onClose }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <span>{error}</span>
      <button type="button" onClick={onClose}>
        <X className="size-4" />
      </button>
    </div>
  );
}
