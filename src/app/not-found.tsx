import type { Metadata } from "next";
import Link from "next/link";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

/*
 * Rendered outside the authenticated pages, so it cannot read the session —
 * hence a plain logo instead of AppHeader, and links that work signed in or out.
 */
export default function NotFound() {
  return (
    <>
      <header className="border-b border-border bg-base">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-6">
          <Link
            href="/"
            className="rounded-sm transition-opacity duration-350 ease-smooth hover:opacity-75"
            aria-label="Home"
          >
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-md text-center">
          <p className="label-caps text-xs text-accent">404</p>

          <h1 className="mt-4 text-xl font-bold text-balance">This page does not exist</h1>

          <p className="mt-4 text-sm text-muted text-pretty">
            The link may be out of date. A few routes were renamed, and the old ones redirect —
            anything else lands here.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/library">Go to library</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Home
            </ButtonLink>
          </div>
        </div>
      </main>

      <AttributionFooter />
    </>
  );
}
