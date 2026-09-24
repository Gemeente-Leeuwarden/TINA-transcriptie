import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createLocalAccountApi,
  fetchUsersApi,
  updateUserRoleApi,
} from "@/pages/admin/api";
import { USER_PAGE_SIZE } from "@/pages/admin/constants";
import { CreateAccountModal } from "@/pages/admin/components/CreateAccountModal";
import { ManagedUserCard } from "@/pages/admin/components/ManagedUserCard";
import { useOnlineUsers } from "@/pages/admin/hooks/useOnlineUsers";
import type {
  ManagedUserItem,
  PlatformRole,
  UserSourceTab,
} from "@/pages/admin/types";
import { buildPaginationButtons } from "@/pages/admin/utils";

interface AdminUsersTabProps {
  token: string | null;
}

export function AdminUsersTab({ token }: AdminUsersTabProps) {
  const [userSourceTab, setUserSourceTab] = useState<UserSourceTab>("local");
  const [managedUsers, setManagedUsers] = useState<ManagedUserItem[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersNotice, setUsersNotice] = useState<string | null>(null);
  const [updatingRoleUserID, setUpdatingRoleUserID] = useState<number | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const onlineUserIds = useOnlineUsers(token, true);
  const userPageButtons = buildPaginationButtons(userPage, userTotalPages);

  const fetchUsers = useCallback(
    async (source: UserSourceTab, page: number) => {
      if (!token) return;
      setIsLoadingUsers(true);
      setUsersError(null);
      try {
        const data = await fetchUsersApi(token, source, page, USER_PAGE_SIZE);
        setManagedUsers(data.users ?? []);
        setUserPage(data.pagination?.page ?? page);
        setUserTotal(data.pagination?.total ?? 0);
        setUserTotalPages(data.pagination?.total_pages ?? 0);
      } catch (err) {
        setUsersError(err instanceof Error ? err.message : "Gebruikers laden mislukt");
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    void fetchUsers(userSourceTab, userPage);
  }, [fetchUsers, token, userPage, userSourceTab]);

  useEffect(() => {
    if (!isCreateModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCreating) {
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isCreateModalOpen, isCreating]);

  const openCreateModal = useCallback(() => {
    setUsersNotice(null);
    setCreateError(null);
    setCreateEmail("");
    setCreatePassword("");
    setCreateConfirmPassword("");
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    if (isCreating) return;
    setIsCreateModalOpen(false);
    setCreateError(null);
  }, [isCreating]);

  const handleCreateAccount = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!token) return;

      if (!createEmail || !createPassword || !createConfirmPassword) {
        setCreateError("Alle velden zijn verplicht");
        return;
      }
      if (createPassword !== createConfirmPassword) {
        setCreateError("Wachtwoorden komen niet overeen");
        return;
      }
      if (createPassword.length < 6) {
        setCreateError("Wachtwoord moet minimaal 6 tekens zijn");
        return;
      }

      setIsCreating(true);
      setCreateError(null);
      try {
        await createLocalAccountApi(token, createEmail, createPassword);
        setUsersNotice("Account aangemaakt.");
        setIsCreateModalOpen(false);
        setCreateEmail("");
        setCreatePassword("");
        setCreateConfirmPassword("");
        setUserSourceTab("local");
        setUserPage(1);
        await fetchUsers("local", 1);
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "Account aanmaken mislukt");
      } finally {
        setIsCreating(false);
      }
    },
    [createConfirmPassword, createEmail, createPassword, fetchUsers, token]
  );

  const handleRoleUpdate = useCallback(
    async (target: ManagedUserItem, nextRole: PlatformRole) => {
      if (!token) return;
      if (target.role === nextRole) return;

      setUpdatingRoleUserID(target.id);
      setUsersError(null);
      setUsersNotice(null);
      try {
        const updatedUser = await updateUserRoleApi(token, target.id, nextRole);
        if (updatedUser) {
          setManagedUsers((prev) =>
            prev.map((row) => (row.id === updatedUser.id ? updatedUser : row))
          );
        } else {
          setManagedUsers((prev) =>
            prev.map((row) => (row.id === target.id ? { ...row, role: nextRole } : row))
          );
        }
        setUsersNotice(`Rol bijgewerkt voor ${target.email}.`);
      } catch (err) {
        setUsersError(err instanceof Error ? err.message : "Rol wijzigen mislukt");
      } finally {
        setUpdatingRoleUserID(null);
      }
    },
    [token]
  );

  return (
    <>
      <Card className="border-violet-200/70 bg-violet-50/20">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Gebruikersbeheer</CardTitle>
            <CardDescription>
              Bekijk gebruikers, wijzig rollen en maak nieuwe accounts aan.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void fetchUsers(userSourceTab, userPage)}
              disabled={isLoadingUsers}
            >
              {isLoadingUsers ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Vernieuwen
            </Button>
            <Button type="button" size="sm" onClick={openCreateModal}>
              <UserPlus className="size-4" />
              Nieuw account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {usersError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {usersError}
            </div>
          )}
          {usersNotice && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {usersNotice}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={userSourceTab === "local" ? "secondary" : "ghost"}
              onClick={() => {
                setUserSourceTab("local");
                setUserPage(1);
              }}
            >
              Lokale accounts
            </Button>
            <Button
              type="button"
              size="sm"
              variant={userSourceTab === "azure" ? "secondary" : "ghost"}
              onClick={() => {
                setUserSourceTab("azure");
                setUserPage(1);
              }}
            >
              Azure accounts
            </Button>
          </div>

          {isLoadingUsers ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Gebruikers laden...
            </div>
          ) : managedUsers.length === 0 ? (
            <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Geen {userSourceTab === "local" ? "lokale" : "Azure"} accounts gevonden.
            </div>
          ) : (
            <div className="space-y-3">
              {managedUsers.map((managedUser) => (
                <ManagedUserCard
                  key={managedUser.id}
                  managedUser={managedUser}
                  onlineUserIds={onlineUserIds}
                  roleBusy={updatingRoleUserID === managedUser.id}
                  onRoleChange={handleRoleUpdate}
                />
              ))}
            </div>
          )}

          {!isLoadingUsers && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-xs text-muted-foreground">
                Pagina {userPage} van {Math.max(userTotalPages, 1)} ({userTotal}{" "}
                {userSourceTab === "local" ? "lokale" : "Azure"} accounts)
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                  disabled={isLoadingUsers || userPage <= 1}
                >
                  Vorige
                </Button>
                {userPageButtons.map((page) => (
                  <Button
                    key={page}
                    type="button"
                    size="sm"
                    variant={page === userPage ? "secondary" : "ghost"}
                    onClick={() => setUserPage(page)}
                    disabled={isLoadingUsers}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setUserPage((prev) => Math.min(Math.max(userTotalPages, 1), prev + 1))
                  }
                  disabled={isLoadingUsers || userTotalPages === 0 || userPage >= userTotalPages}
                >
                  Volgende
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isCreateModalOpen && (
        <CreateAccountModal
          createEmail={createEmail}
          createPassword={createPassword}
          createConfirmPassword={createConfirmPassword}
          createError={createError}
          isCreating={isCreating}
          onClose={closeCreateModal}
          onSubmit={handleCreateAccount}
          onEmailChange={setCreateEmail}
          onPasswordChange={setCreatePassword}
          onConfirmPasswordChange={setCreateConfirmPassword}
        />
      )}
    </>
  );
}
