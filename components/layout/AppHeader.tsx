"use client";

import { usePathname } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import UserMenuButton from "./UserMenuButton";
import AccountMenuButton from "./AccountMenuButton";

interface Props {
  onToggleSidebar: () => void;
}

const MODULE_HEADERS: Record<string, { title: string; icon: string }> = {
  "/modules/blueprint-library": { title: "Blueprint Library", icon: "/ui/bpTracker.svg" },
  "/modules/system-library": { title: "System Library", icon: "/ui/moduleLibrary.svg" },
  "/modules/blueprint-tracker": { title: "Blueprint Tracker", icon: "/ui/bpTracker.svg" },
  "/modules/blueprint-fragments": { title: "Blueprint Fragments", icon: "/ui/bpTracker.svg" },
  "/modules/fleet-builder": { title: "Fleet Builder", icon: "/ui/fleetBuilder.svg" },
  "/modules/mail-editor": { title: "Mail Editor", icon: "/ui/mailEditor.svg" },
};



export default function AppHeader({ onToggleSidebar }: Props) {
  const pathname = usePathname();
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const setIsDarkMode = useUserStore((s) => s.setIsDarkMode);
  
  // Find the matching header data. We use startsWith because mail-editor has sub-routes.
  const headerKey = Object.keys(MODULE_HEADERS).find(key => pathname.startsWith(key));
  const headerData = headerKey ? MODULE_HEADERS[headerKey] : null;

  function toggleDark() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    // <html> is the source of truth for tailwind's selector mode. `data-theme`
    // is kept in lockstep so FlyonUI's component tokens follow our toggle rather
    // than the OS `prefers-color-scheme` (which otherwise blackens inputs).
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* ignore */ }
  }

  return (
    <nav className="navbar sticky top-0 z-10 w-screen justify-between gap-4 bg-body shadow transition duration-500 dark:shadow-neutral-700">
      <div className="navbar-start">
        <button type="button" className="btn btn-circle btn-text" onClick={onToggleSidebar}>
          <img className="size-8 select-none transition duration-500 dark:invert" src="/ui/menu.svg" alt="Toggle side menu" />
        </button>
      </div>

      <div className="navbar-center">
        {headerData && (
          <div className="flex items-center gap-3">
            <img 
              className="size-8 select-none -scale-x-100 transition duration-500 dark:invert" 
              src={headerData.icon} 
              aria-hidden="true" 
            />
            <h1 className="hidden text-xl font-bold transition duration-500 sm:block">
              {headerData.title}
            </h1>
            <img 
              className="size-8 select-none transition duration-500 dark:invert" 
              src={headerData.icon} 
              aria-hidden="true" 
            />
          </div>
        )}
      </div>

      <div className="navbar-end items-center gap-4">
        <label className="swap swap-rotate">
          {/* this hidden checkbox controls the state (the swap component hides it).
              Theme switching is owned by React (toggleDark → classList on <html>),
              so no daisyUI theme-controller class is needed. */}
          <input
            type="checkbox"
            value="dark"
            aria-checked={isDarkMode}
            onClick={toggleDark}/>

          {/* sun icon */}
          <svg
            className="swap-off h-10 w-10 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24">
            <path
              d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
          </svg>

          {/* moon icon */}
          <svg
            className="swap-on h-10 w-10 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24">
            <path
              d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
          </svg>
        </label>
        <AccountMenuButton />
        <UserMenuButton />
      </div>
    </nav>
  );
}
