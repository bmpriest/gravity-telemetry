"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { formatDate } from "@/utils/functions";

interface Props {
  onContributors: () => void;
  onChangelog: () => void;
  onContact: () => void;
  onClose: () => void;
}

type NavButton = {
  displayName: string;
  altName?: string;
  src: string;
  route: string;
  disabled?: true;
  tag?: { name: string; color: string };
};

const navButtons: NavButton[] = [
  { displayName: "Home", src: "/ui/home.svg", route: "/home" },
  { displayName: "Module Library", src: "/ui/moduleLibrary.svg", route: "/modules/module-library", tag: { name: "Updated", color: "bg-blue-100" } },
  { displayName: "Blueprint Tracker", src: "/ui/bpTracker.svg", route: "/modules/blueprint-tracker", tag: { name: "New", color: "bg-orange-100" } },
  { displayName: "Fleet Builder", src: "/ui/fleetBuilder.svg", route: "/modules/fleet-builder", tag: { name: "New", color: "bg-orange-100" } },
  { displayName: "Mail Editor", src: "/ui/mailEditor.svg", route: "/modules/mail-editor", tag: { name: "New", color: "bg-orange-100" } },
];

export default function AppSidebar({ onContributors, onChangelog, onContact, onClose }: Props) {
  const pathname = usePathname();
  const alert = useUserStore((s) => s.alert);
  const setAlert = useUserStore((s) => s.setAlert);

  function closeAlert() {
    if (!alert) return;
    setAlert({ ...alert, show: false });
    localStorage.setItem("alert", alert.id);
  }

  return (
    <aside
      id="default-sidebar"
      className="fixed left-0 z-20 h-[calc(100dvh-4rem)] w-72"
      aria-label="Sidebar"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex h-full w-full flex-col items-center justify-between overflow-y-auto bg-neutral-50 px-3 py-4 transition duration-500 dark:bg-neutral-900">
        <ul className="w-full space-y-2 font-medium">
          {navButtons.map((button) => (
            <li key={button.displayName}>
              {button.disabled ? (
                <div className="group flex w-full select-none items-center rounded-lg bg-neutral-200 p-2 text-neutral-900 transition duration-500 dark:bg-neutral-700">
                  <img className="size-6 select-none transition duration-500 hover:duration-300 dark:invert" src={button.src} alt={`Go to ${button.altName ?? button.displayName}`} />
                  <span className={`ms-3 transition duration-500 ${button.tag ? "flex-1 whitespace-nowrap text-left" : ""}`}>{button.displayName}</span>
                  {button.tag && (
                    <span className={`ms-3 inline-flex items-center justify-center rounded-full px-2 text-sm font-medium text-neutral-800 ${button.tag.color}`}>{button.tag.name}</span>
                  )}
                </div>
              ) : (
                <Link
                  href={button.route}
                  className={`group flex items-center rounded-lg p-2 text-neutral-900 transition duration-500 hover:bg-neutral-200/50 hover:duration-150 dark:hover:bg-neutral-800 ${pathname.includes(button.route) ? "bg-neutral-200/50 dark:bg-neutral-800" : ""}`}
                  onClick={onClose}
                >
                  <img
                    className={`size-6 select-none transition duration-500 hover:duration-300 group-hover:scale-110 dark:invert ${pathname.includes(button.route) ? "scale-110" : ""}`}
                    src={button.src}
                    alt={`Go to ${button.altName ?? button.displayName}`}
                  />
                  <span className={`ms-3 text-left transition duration-500 ${button.tag ? "flex-1 whitespace-nowrap" : ""} ${pathname.includes(button.route) ? "font-bold" : ""}`}>
                    {button.displayName}
                  </span>
                  {button.tag && (
                    <span className={`ms-3 inline-flex items-center justify-center rounded-full px-2 text-sm font-medium text-neutral-800 ${button.tag.color}`}>{button.tag.name}</span>
                  )}
                </Link>
              )}
            </li>
          ))}

          {alert?.show && (
            <div className="mt-6 rounded-lg bg-blue-50 p-4 transition duration-500 dark:bg-blue-900" role="alert">
              <div className="mb-3 flex items-center">
                <span className="me-2 rounded bg-orange-100 px-2.5 py-0.5 text-sm font-semibold text-orange-800 transition duration-500 dark:bg-orange-200 dark:text-orange-900">{alert.tag}</span>
                <button
                  type="button"
                  className="-mx-1.5 -my-1.5 ms-auto inline-flex h-6 w-6 items-center justify-center rounded-lg p-0.5 transition duration-500 hover:bg-blue-200 dark:hover:bg-blue-800"
                  aria-label="Close"
                  onClick={closeAlert}
                >
                  <img className="size-6 select-none transition duration-500 dark:invert" src="/ui/close.svg" aria-hidden="true" />
                </button>
              </div>
              <p className="mb-3 text-left text-sm text-blue-800 transition duration-500 dark:text-blue-200">{alert.description}</p>
              <p className="text-left text-xs text-blue-900 transition duration-500 dark:text-blue-300">{formatDate(alert.date, "numeric")}</p>
            </div>
          )}
        </ul>

        <div className="flex w-full items-center justify-center font-medium">
          <div className="du-tooltip" data-tip="Contributors">
            <button type="button" className="fo-btn fo-btn-circle fo-btn-text" onClick={onContributors}>
              <img className="size-7 select-none transition duration-500 dark:invert" src="/ui/contributors.svg" alt="Contributors" />
            </button>
          </div>
          <div className="du-divider du-divider-horizontal before:transition before:duration-500 after:transition after:duration-500 dark:before:bg-neutral-600 dark:after:bg-neutral-600" />
          <div className="du-tooltip" data-tip="Info">
            <button type="button" className="fo-btn fo-btn-circle fo-btn-text" onClick={onChangelog}>
              <img className="size-7 select-none transition duration-500 dark:invert" src="/ui/info.svg" alt="Changelog" />
            </button>
          </div>
          <div className="du-divider du-divider-horizontal before:transition before:duration-500 after:transition after:duration-500 dark:before:bg-neutral-600 dark:after:bg-neutral-600" />
          <div className="du-tooltip" data-tip="Contact">
            <button type="button" className="fo-btn fo-btn-circle fo-btn-text" onClick={onContact}>
              <img className="size-6 select-none transition duration-500 dark:invert" src="/ui/contact.svg" alt="Contact" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
