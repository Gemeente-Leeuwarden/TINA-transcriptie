import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AudioLines, LogOut, Menu } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Home", exact: true },
  { to: "/session", label: "Sessies" },
  { to: "/upload", label: "Upload" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showAccount =
    user ? user.Source !== "azure" || user.Role === "admin" : false;
  const isAdmin = user?.Role === "admin";
  const isWidePage = location.pathname.startsWith("/session/");

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <AudioLines className="size-5" />
            <span className="text-lg font-semibold">Tina</span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.to}
                  asChild
                  variant={isActive(item.to, item.exact) ? "secondary" : "ghost"}
                  size="sm"
                >
                  <Link to={item.to}>{item.label}</Link>
                </Button>
              ))}
              {showAccount && (
                <Button
                  asChild
                  variant={isActive("/account") ? "secondary" : "ghost"}
                  size="sm"
                >
                  <Link to="/account">Account</Link>
                </Button>
              )}
              {isAdmin && (
                <Button
                  asChild
                  variant={isActive("/admin") ? "secondary" : "ghost"}
                  size="sm"
                >
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
            </nav>
            <Separator orientation="vertical" className="hidden md:block h-5" />
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-32">
              {user?.Email}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="size-4" />
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-6 py-2 space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.to}
                asChild
                variant={isActive(item.to, item.exact) ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
              >
                <Link
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </Button>
            ))}
            {showAccount && (
              <Button
                asChild
                variant={isActive("/account") ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
              >
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button
                asChild
                variant={isActive("/admin") ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
              >
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              </Button>
            )}
            <div className="pt-1 text-sm text-muted-foreground sm:hidden">
              {user?.Email}
            </div>
          </div>
        )}
      </header>
      <main
        className={`mx-auto flex w-full flex-col gap-6 px-6 py-8 ${
          isWidePage ? "max-w-none" : "max-w-5xl"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
