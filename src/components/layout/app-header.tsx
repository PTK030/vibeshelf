import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { providerMeta } from "@/lib/ai/providers";
import type { Session } from "@/lib/auth/session";

interface AppHeaderProps {
  /* Omitted on the landing page, where nobody is signed in yet. */
  session?: Session;
}

export function AppHeader({ session }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-base/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link
          href={session === undefined ? "/" : "/biblioteka"}
          className="rounded-sm transition-opacity duration-350 ease-smooth hover:opacity-75"
          aria-label="Strona główna"
        >
          <Logo />
        </Link>

        {session !== undefined && (
          <UserMenu
            displayName={session.displayName}
            imageUrl={session.imageUrl}
            providerName={
              session.ai === undefined ? undefined : providerMeta(session.ai.provider).name
            }
          />
        )}
      </div>
    </header>
  );
}
