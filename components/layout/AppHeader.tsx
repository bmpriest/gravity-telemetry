"use client";

import { usePathname } from "next/navigation";
import UserMenuButton from "./UserMenuButton";

interface Props {
  onToggleSidebar: () => void;
}

const MODULE_HEADERS: Record<string, { title: string; icon: string }> = {
  "/modules/blueprint-tracker": { title: "Blueprint Tracker", icon: "/ui/bpTracker.svg" },
  "/modules/fleet-builder": { title: "Fleet Builder", icon: "/ui/fleetBuilder.svg" },
  "/modules/mail-editor": { title: "Mail Editor", icon: "/ui/mailEditor.svg" },
  "/modules/module-library": { title: "Module Library", icon: "/ui/moduleLibrary.svg" },
};

export default function AppHeader({ onToggleSidebar }: Props) {
  const pathname = usePathname();
  
  // Find the matching header data. We use startsWith because mail-editor has sub-routes.
  const headerKey = Object.keys(MODULE_HEADERS).find(key => pathname.startsWith(key));
  const headerData = headerKey ? MODULE_HEADERS[headerKey] : null;

  return (
    <nav className="fo-navbar sticky top-0 z-10 w-screen justify-between gap-4 bg-body shadow transition duration-500 dark:shadow-neutral-700">
      <div className="fo-navbar-start">
        <button type="button" className="fo-btn fo-btn-circle fo-btn-text" onClick={onToggleSidebar}>
          <img className="size-8 select-none transition duration-500 dark:invert" src="/ui/menu.svg" alt="Toggle side menu" />
        </button>
      </div>

      <div className="fo-navbar-center">
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

      <div className="fo-navbar-end items-center gap-4">
        <UserMenuButton />
      </div>
    </nav>
  );
}
