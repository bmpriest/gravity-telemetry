"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/userStore";

export default function UserMenu() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/home");
  }

  // Not yet resolved
  if (user === undefined) {
    return (
      <div className="size-8" aria-hidden="true" />
    );
  }

  // Logged out
  if (user === null) {
    return (
      <Link
        href="/login"
        className="du-btn select-none rounded-xl border-blue-300 bg-blue-100 px-3 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
      >
        Sign in
      </Link>
    );
  }

  // Logged in
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="du-btn select-none rounded-xl border-blue-300 bg-blue-100 px-3 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
      >
        <span className="hidden sm:inline">{user.username}</span>
        <img className="size-5 select-none transition duration-500 dark:invert sm:hidden" src="/ui/person.svg" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-20 flex w-48 flex-col items-stretch gap-1 rounded-xl border-2 border-blue-300 bg-blue-100 p-2 shadow transition duration-500 dark:border-blue-500 dark:bg-blue-800"
        >
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-left text-sm transition duration-500 hover:bg-blue-200 dark:hover:bg-blue-700"
          >
            Account
          </Link>
          {user.isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-left text-sm transition duration-500 hover:bg-blue-200 dark:hover:bg-blue-700"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-left text-sm transition duration-500 hover:bg-blue-200 dark:hover:bg-blue-700"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
