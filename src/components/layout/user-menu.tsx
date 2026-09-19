"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { POP_TRANSITION } from "@/lib/motion";

export interface UserMenuProps {
  displayName: string | null;
  imageUrl: string | null;
  /* Name of the connected AI provider, or undefined when none is set up. */
  providerName: string | undefined;
}

const PANEL = {
  initial: { opacity: 0, y: -6, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.97 },
};

export function UserMenu({ displayName, imageUrl, providerName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((current) => !current), []);
  const close = useCallback(() => setOpen(false), []);

  /* Dismiss on outside click and on Escape — both expected of a menu. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = displayName ?? "Your account";
  const initial = (displayName ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          "flex items-center gap-2 rounded-pill p-1 pr-3",
          "transition-colors duration-350 ease-smooth hover:bg-surface-hover",
          open && "bg-surface-hover",
        )}
      >
        {imageUrl === null ? (
          <span className="grid size-8 place-items-center rounded-full bg-surface-hover text-xs font-bold text-foreground">
            {initial}
          </span>
        ) : (
          <Image
            src={imageUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
          />
        )}
        <span className="hidden max-w-32 truncate text-xs text-muted sm:inline">{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={PANEL.initial}
            animate={PANEL.animate}
            exit={PANEL.exit}
            transition={POP_TRANSITION}
            className={cn(
              "absolute right-0 z-50 mt-2 w-60 origin-top-right overflow-hidden",
              "rounded-lg border border-border bg-elevated shadow-modal",
            )}
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-0.5 text-2xs text-muted">
                {providerName === undefined ? "No AI connected" : `AI: ${providerName}`}
              </p>
            </div>

            <div className="p-1">
              <MenuLink href="/library" onNavigate={close}>
                Library
              </MenuLink>
              <MenuLink href="/organize" onNavigate={close}>
                Organize
              </MenuLink>
              <MenuLink href="/settings" onNavigate={close}>
                Settings
              </MenuLink>
            </div>

            <div className="border-t border-border p-1">
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  role="menuitem"
                  className={cn(
                    "w-full rounded-sm px-3 py-2 text-left text-sm text-danger",
                    "transition-colors duration-350 ease-smooth hover:bg-surface-hover",
                  )}
                >
                  Sign out
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MenuLinkProps {
  href: string;
  onNavigate: () => void;
  children: string;
}

function MenuLink({ href, onNavigate, children }: MenuLinkProps) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "block rounded-sm px-3 py-2 text-sm text-muted",
        "transition-colors duration-350 ease-smooth hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
