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
    <header className="border-b border-border bg-base">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link
          href={session === undefined ? "/" : "/library"}
          className="rounded-sm transition-opacity duration-350 ease-smooth hover:opacity-75"
          aria-label="Home"
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
