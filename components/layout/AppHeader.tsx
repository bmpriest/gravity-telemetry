"use client";

import Link from "next/link";
import { useUserStore } from "@/stores/userStore";

interface Props {
  onToggleSidebar: () => void;
}

export default function AppHeader({ onToggleSidebar }: Props) {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const setIsDarkMode = useUserStore((s) => s.setIsDarkMode);

  function toggleDark() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.body.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <nav className="fo-navbar sticky top-0 z-10 w-screen justify-between gap-4 bg-body shadow transition duration-500 dark:shadow-neutral-700">
      <div className="fo-navbar-start">
        <button type="button" className="fo-btn fo-btn-circle fo-btn-text" onClick={onToggleSidebar}>
          <img className="size-8 select-none transition duration-500 dark:invert" src="/ui/menu.svg" alt="Toggle side menu" />
        </button>
      </div>
      <div className="fo-navbar-center flex items-center">
        <Link href="/home">
          <img className="h-10 select-none transition duration-500 dark:invert" src="/logo/gravityAssist.svg" aria-hidden="true" />
        </Link>
      </div>
      <div className="fo-navbar-end items-center gap-4">
        <label className="du-swap du-swap-rotate">
          <input type="checkbox" className="theme-controller hidden" checked={isDarkMode} onChange={toggleDark} />
          <img className="du-swap-off size-8 select-none" src="/ui/sun.svg" aria-hidden="true" />
          <img className="du-swap-on size-8 select-none invert" src="/ui/moon.svg" aria-hidden="true" />
        </label>
      </div>
    </nav>
  );
}
