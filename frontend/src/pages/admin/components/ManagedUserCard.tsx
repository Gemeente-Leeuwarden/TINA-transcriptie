import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import type { ManagedUserItem, PlatformRole } from "@/pages/admin/types";
import { sourceLabel } from "@/pages/admin/utils";

interface ManagedUserCardProps {
  managedUser: ManagedUserItem;
  onlineUserIds: Set<number>;
  roleBusy: boolean;
  onRoleChange: (target: ManagedUserItem, nextRole: PlatformRole) => void | Promise<void>;
}

export function ManagedUserCard({
  managedUser,
  onlineUserIds,
  roleBusy,
  onRoleChange,
}: ManagedUserCardProps) {
  const roleLocked = managedUser.is_current_user || managedUser.source === "azure";
  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <span
              className={`inline-block size-2 rounded-full ${
                onlineUserIds.has(managedUser.id) ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            />
            {managedUser.email}
          </div>
          <div className="text-xs text-muted-foreground">
            Bron: {sourceLabel(managedUser.source)} &bull; aangemaakt: {formatDate(managedUser.created_at)}
          </div>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          Rol: {managedUser.role === "admin" ? "Admin" : "Gebruiker"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={managedUser.role === "admin" ? "secondary" : "ghost"}
          disabled={roleBusy || roleLocked || managedUser.role === "admin"}
          onClick={() => void onRoleChange(managedUser, "admin")}
        >
          {roleBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          Maak admin
        </Button>
        <Button
          type="button"
          size="sm"
          variant={managedUser.role === "user" ? "secondary" : "ghost"}
          disabled={roleBusy || roleLocked || managedUser.role === "user"}
          onClick={() => void onRoleChange(managedUser, "user")}
        >
          {roleBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          Maak gebruiker
        </Button>
      </div>

      {managedUser.is_current_user && (
        <div className="mt-2 text-xs text-muted-foreground">
          Je eigen rol kan hier niet worden gewijzigd.
        </div>
      )}
      {managedUser.source === "azure" && (
        <div className="mt-2 text-xs text-muted-foreground">
          Azure-account rollen worden bepaald via Azure groepen.
        </div>
      )}
    </div>
  );
}
