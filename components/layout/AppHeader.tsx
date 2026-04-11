"use client";

import UserMenuButton from "./UserMenuButton";

interface Props {
  onToggleSidebar: () => void;
}

export default function AppHeader({ onToggleSidebar }: Props) {
  return (
    <nav className="fo-navbar sticky top-0 z-10 w-screen justify-between gap-4 bg-body shadow transition duration-500 dark:shadow-neutral-700">
      <div className="fo-navbar-start">
        <button type="button" className="fo-btn fo-btn-circle fo-btn-text" onClick={onToggleSidebar}>
          <img className="size-8 select-none transition duration-500 dark:invert" src="/ui/menu.svg" alt="Toggle side menu" />
        </button>
      </div>
      <div className="fo-navbar-end items-center gap-4">
        <UserMenuButton />
      </div>
    </nav>
  );
}
