import { type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateAccountModalProps {
  createEmail: string;
  createPassword: string;
  createConfirmPassword: string;
  createError: string | null;
  isCreating: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}

export function CreateAccountModal({
  createEmail,
  createPassword,
  createConfirmPassword,
  createError,
  isCreating,
  onClose,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
}: CreateAccountModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Nieuw account</h2>
            <p className="text-sm text-muted-foreground">Maak een nieuw lokaal account aan.</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} disabled={isCreating}>
            <X className="size-4" />
          </Button>
        </div>

        <form className="space-y-4 p-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="modal-create-email">E-mail</Label>
            <Input
              id="modal-create-email"
              type="email"
              autoComplete="email"
              value={createEmail}
              onChange={(event) => onEmailChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modal-create-password">Wachtwoord</Label>
            <Input
              id="modal-create-password"
              type="password"
              autoComplete="new-password"
              value={createPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modal-create-confirm-password">Bevestig wachtwoord</Label>
            <Input
              id="modal-create-confirm-password"
              type="password"
              autoComplete="new-password"
              value={createConfirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
            />
          </div>

          {createError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Bezig met aanmaken...
                </>
              ) : (
                "Account aanmaken"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
