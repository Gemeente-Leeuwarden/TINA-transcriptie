import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { LoginBackground } from "@/pages/login/components/LoginBackground";
import { LoginFooter } from "@/pages/login/components/LoginFooter";
import { useAuthMethods } from "@/pages/login/hooks/useAuthMethods";
import { useLoginQueryParams } from "@/pages/login/hooks/useLoginQueryParams";
import { useWaveformAnimation } from "@/pages/login/hooks/useWaveformAnimation";

export default function Login() {
  useDocumentTitle("Login");

  const { login } = useAuth();
  const methods = useAuthMethods();
  const { waveRef } = useWaveformAnimation();

  const [email, setEmail] = useState(import.meta.env.VITE_DEV_EMAIL ?? "");
  const [password, setPassword] = useState(import.meta.env.VITE_DEV_PASSWORD ?? "");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useLoginQueryParams({ login, onError: setError });

  const localEnabled = methods?.local ?? true;
  const azureEnabled = methods?.azure ?? true;
  const registrationEnabled = methods?.registration ?? false;

  useEffect(() => {
    if (!methods) return;
    if (mode === "login" && !localEnabled && registrationEnabled) {
      setMode("register");
    }
    if (mode === "register" && !registrationEnabled && localEnabled) {
      setMode("login");
    }
  }, [methods, mode, localEnabled, registrationEnabled]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      if (mode === "login" && !localEnabled) {
        throw new Error("Lokale aanmelding is uitgeschakeld.");
      }
      if (mode === "register" && !registrationEnabled) {
        throw new Error("Registratie is uitgeschakeld.");
      }

      const endpoint = mode === "register" ? "/api/auth/local/register" : "/api/auth/local/login";
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const fallback = mode === "register" ? "Registratie mislukt" : "Ongeldig e-mailadres of wachtwoord";
        throw new Error(data?.message ?? data?.error ?? fallback);
      }

      if (mode === "register") {
        setNotice("Account aangemaakt. Log in om verder te gaan.");
        setMode("login");
        setPassword("");
      } else {
        const { token } = await res.json();
        login(token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setIsLoading(false);
    }
  }

  const hasAnyMethod = localEnabled || azureEnabled || registrationEnabled;

  return (
    <div className="login-page relative flex min-h-screen flex-col overflow-hidden">
      <LoginBackground waveRef={waveRef} />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8 login-fade-in">
          <div className="flex flex-col items-center space-y-4">
            <img
              src="/logo.png"
              alt="Tina"
              className="login-logo-enter h-20 w-auto brightness-0 invert drop-shadow-lg"
            />
            <p className="login-tagline-enter text-center text-sm font-medium tracking-wide text-white/80">
              Betrouwbare Transcriptie voor Publieke Organisaties
            </p>
          </div>

          <div className="login-card-enter rounded-2xl border border-white/30 bg-white p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-foreground">
                  {mode === "register" ? "Account aanmaken" : "Inloggen"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "register"
                    ? "Maak je account aan om te beginnen."
                    : "Vul je gegevens in om verder te gaan."}
                </p>
              </div>

              {!hasAnyMethod && (
                <div className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  Er zijn momenteel geen inlogmethoden ingeschakeld. Neem contact op met je beheerder.
                </div>
              )}

              {notice && (
                <div className="rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{notice}</div>
              )}

              {(localEnabled || registrationEnabled) && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jij@example.com"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="border-gray-300 bg-gray-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Wachtwoord"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="border-gray-300 bg-gray-100 pr-9"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {mode === "register" ? "Account aanmaken..." : "Bezig met inloggen..."}
                      </>
                    ) : mode === "register" ? (
                      "Account aanmaken"
                    ) : (
                      "Inloggen"
                    )}
                  </Button>
                </form>
              )}

              {localEnabled && azureEnabled && mode === "login" && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-muted-foreground">of</span>
                  </div>
                </div>
              )}

              {azureEnabled && mode === "login" && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/azure/login/azure`;
                  }}
                >
                  <svg className="size-4" viewBox="0 0 23 23" fill="none">
                    <path d="M11 1H1v10h10V1z" fill="#F25022" />
                    <path d="M22 1H12v10h10V1z" fill="#7FBA00" />
                    <path d="M11 12H1v10h10V12z" fill="#00A4EF" />
                    <path d="M22 12H12v10h10V12z" fill="#FFB900" />
                  </svg>
                  Doorgaan met Microsoft
                </Button>
              )}

              {(registrationEnabled || localEnabled) && (
                <div className="text-center text-sm text-muted-foreground">
                  {mode === "login" && registrationEnabled ? "Nog geen account?" : ""}{" "}
                  {(mode === "login" ? registrationEnabled : localEnabled) && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setNotice(null);
                        setMode(mode === "login" ? "register" : "login");
                      }}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {mode === "login" ? "Maak er een aan" : "Inloggen"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <LoginFooter />
    </div>
  );
}
