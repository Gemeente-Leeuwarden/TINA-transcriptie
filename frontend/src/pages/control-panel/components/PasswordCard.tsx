import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { changePasswordApi } from "@/pages/control-panel/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordCardProps {
  token: string | null;
  onPasswordChanged: () => void;
}

export function PasswordCard({ token, onPasswordChanged }: PasswordCardProps) {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    if (!currentPassword || !newPassword) {
      setPasswordError("Alle velden zijn verplicht");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Nieuwe wachtwoorden komen niet overeen");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Nieuw wachtwoord moet minimaal 6 tekens zijn");
      return;
    }

    setIsSavingPassword(true);
    setPasswordError(null);
    try {
      await changePasswordApi(token, currentPassword, newPassword);
      onPasswordChanged();
      navigate("/login", { replace: true });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Wachtwoord wijzigen mislukt");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <Card className="border-amber-200/70 bg-amber-50/30">
      <CardHeader className="flex-row items-start gap-3">
        <div className="mt-1 flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <KeyRound className="size-4" />
        </div>
        <div>
          <CardTitle>Wachtwoord</CardTitle>
          <CardDescription>Werk je wachtwoord bij en log opnieuw in.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div className="space-y-2">
            <Label htmlFor="current-password">Huidig wachtwoord</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nieuw wachtwoord</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Bevestig nieuw wachtwoord</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {passwordError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {passwordError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSavingPassword}>
            {isSavingPassword ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Bezig met opslaan...
              </>
            ) : (
              <>
                <KeyRound className="size-4" />
                Wachtwoord wijzigen
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
