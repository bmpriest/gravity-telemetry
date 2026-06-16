"use client";

/**
 * Top-right header dropdown. Always-visible auth + theme controls so the user
 * never has to slide the sidebar open just to log out or switch theme.
 *
 * Logged in:
 *   - username (button)
 *   - Admin panel link (only if role === "ADMIN")
 *   - Theme toggle row (Light / Dark)
 *   - Log out
 *
 * Logged out:
 *   - "Sign in" → /login
 *
 * The theme toggle writes the `dark` class to <html> (not <body>). Tailwind's
 * `darkMode: "selector"` keys off <html>, so writing it elsewhere silently
 * no-ops — that was the bug in the previous AppHeader implementation.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { useFleetStore } from "@/stores/fleetStore";
import { useBlueprintStore } from "@/stores/blueprintStore";
import { useAccountStore } from "@/stores/accountStore";
import { useMailStore } from "@/stores/mailStore";

export default function UserMenuButton() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const authChecked = useUserStore((s) => s.authChecked);
  const logout = useUserStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside to close. We attach a single mousedown listener while open
  // and detach as soon as the menu closes — cheaper than always-on.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function onLogout() {
    setOpen(false);
    await logout();
    // Drop synced data and re-hydrate localStorage so anything the user worked
    // on while logged in doesn't bleed into a subsequent anonymous session.
    useFleetStore.getState().resetSync();
    useBlueprintStore.getState().resetSync();
    useAccountStore.getState().reset();
    useMailStore.getState().reset();
    router.replace("/home");
  }

  // Avoid flashing a "Sign in" button before fetchMe() has resolved.
  if (!authChecked) {
    return <div className="h-9 w-24" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="btn btn-primary rounded-lg px-4 py-2 text-sm"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn flex items-center gap-2 rounded-lg border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="max-w-[8rem] truncate" title={user.username}>{user.username}</span>
        {user.role === "ADMIN" && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-200 dark:text-orange-900">
            Admin
          </span>
        )}
        <svg className="size-4 transition" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg transition duration-300 dark:border-neutral-700 dark:bg-neutral-800"
        >
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              Admin panel
            </Link>
          )}          

          <div className="border-t border-neutral-200 dark:border-neutral-700" />

          <button
            type="button"
            role="menuitem"
            onClick={() => void onLogout()}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
