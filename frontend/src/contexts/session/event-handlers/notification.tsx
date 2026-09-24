import { toast } from "react-toastify";
import { normalizeNotificationType } from "@/contexts/session/utils";

export function showNotificationToast(msg: Record<string, unknown>): void {
  const rawType = msg.notification_type ?? msg.level ?? msg.variant ?? msg.kind;
  const fallbackType = msg.type;
  const resolvedType =
    rawType ??
    (fallbackType === "good" || fallbackType === "warning" || fallbackType === "bad"
      ? fallbackType
      : "good");
  const title = typeof msg.title === "string" ? msg.title.trim() : "";
  const message = typeof msg.message === "string" ? msg.message.trim() : "";
  if (!title && !message) return;

  const link = typeof msg.link === "string" ? msg.link.trim() : "";
  const toastType = normalizeNotificationType(resolvedType);
  const toastId = typeof msg.id === "string" ? msg.id : undefined;

  const content = (
    <div className="space-y-1">
      {title && <div className="font-semibold">{title}</div>}
      {message && <div className="text-sm opacity-90">{message}</div>}
      {link && (
        <a
          className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
          href={link}
          target={/^https?:\/\//i.test(link) ? "_blank" : undefined}
          rel={/^https?:\/\//i.test(link) ? "noreferrer" : undefined}
        >
          Bekijk link
        </a>
      )}
    </div>
  );

  if (toastType === "good") toast.success(content, { toastId });
  if (toastType === "warning") toast.warning(content, { toastId });
  if (toastType === "bad") toast.error(content, { toastId });
}
