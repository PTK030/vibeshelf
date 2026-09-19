import { SpotifyMark } from "@/components/spotify/spotify-mark";
import { cn } from "@/lib/cn";

interface SignInButtonProps {
  className?: string;
}

/*
 * Points at a route handler that 302s to accounts.spotify.com, so this has to
 * be a real navigation. next/link would try to handle it client-side.
 */
export function SignInButton({ className }: SignInButtonProps) {
  return (
    // eslint-disable-next-line next/no-html-link-for-pages
    <a
      href="/api/auth/spotify"
      className={cn(
        "label-caps inline-flex h-12 items-center justify-center gap-3 rounded-pill px-8",
        "bg-accent text-sm text-on-accent",
        "transition-[transform,background-color,box-shadow] duration-280 ease-smooth",
        "hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-accent",
        "active:translate-y-0 active:bg-accent-press active:shadow-none",
        className,
      )}
    >
      <SpotifyMark className="size-5 fill-on-accent" />
      Zaloguj przez Spotify
    </a>
  );
}
