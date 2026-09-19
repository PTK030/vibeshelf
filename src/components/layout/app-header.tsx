import Link from "next/link";
import { Logo } from "@/components/layout/logo";

interface AppHeaderProps {
  /* Shown on the right when someone is signed in. */
  displayName?: string;
  showSignOut?: boolean;
}

export function AppHeader({ displayName, showSignOut = false }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-base/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="rounded-sm transition-opacity duration-350 ease-smooth hover:opacity-75"
          aria-label="Strona główna"
        >
          <Logo />
        </Link>

        <div className="flex items-center gap-4">
          {displayName !== undefined && (
            <span className="hidden text-xs text-muted sm:inline">{displayName}</span>
          )}
          {showSignOut && (
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-pill px-3 py-1.5 text-2xs text-muted transition-colors duration-350 ease-smooth hover:bg-surface-hover hover:text-foreground"
              >
                Wyloguj
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
