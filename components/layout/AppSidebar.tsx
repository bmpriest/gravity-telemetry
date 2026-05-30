"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUserStore } from "@/stores/userStore";
import { formatDate } from "@/utils/functions";

interface Props {
  onContributors: () => void;
  onChangelog: () => void;
  onContact: () => void;
  onClose: () => void;
}

type NavItem = {
  displayName: string;
  src: string;
  route: string;
  tag?: { name: string; color: string };
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const homeItem: NavItem = { displayName: "Home", src: "/ui/home.svg", route: "/home" };

const sections: NavSection[] = [
  {
    label: "Infinite Archive",
    items: [
      { displayName: "Blueprint Library", src: "/ui/bpTracker.svg", route: "/modules/blueprint-library", tag: { name: "New", color: "bg-orange-100" } },
      { displayName: "System Library", src: "/ui/moduleLibrary.svg", route: "/modules/system-library", tag: { name: "New", color: "bg-orange-100" } },
    ],
  },
  {
    label: "Infinite Workshop",
    items: [
      { displayName: "Blueprint Tracker", src: "/ui/bpTracker.svg", route: "/modules/blueprint-tracker" },
      { displayName: "Fleet Builder", src: "/ui/fleetBuilder.svg", route: "/modules/fleet-builder" },
      { displayName: "Mail Editor", src: "/ui/mailEditor.svg", route: "/modules/mail-editor" },
    ],
  },
];

function NavLink({ item, active, onClose }: { item: NavItem; active: boolean; onClose: () => void }) {
  return (
    <Link
      href={item.route}
      onClick={onClose}
      className={`group flex items-center rounded-lg p-2 text-neutral-900 transition duration-500 hover:bg-neutral-200/50 hover:duration-150 dark:text-neutral-100 dark:hover:bg-neutral-800 ${active ? "bg-neutral-200/50 dark:bg-neutral-800" : ""}`}
    >
      <img
        className={`size-6 select-none transition duration-500 hover:duration-300 group-hover:scale-110 dark:invert ${active ? "scale-110" : ""}`}
        src={item.src}
        alt={`Go to ${item.displayName}`}
      />
      <span className={`ms-3 flex-1 whitespace-nowrap text-left transition duration-500 ${active ? "font-bold" : ""}`}>{item.displayName}</span>
      {item.tag && (
        <span className={`ms-3 inline-flex items-center justify-center rounded-full px-2 text-sm font-medium text-neutral-800 ${item.tag.color}`}>{item.tag.name}</span>
      )}
    </Link>
  );
}

export default function AppSidebar({ onContributors, onChangelog, onContact, onClose }: Props) {
  const pathname = usePathname();
  const alert = useUserStore((s) => s.alert);
  const setAlert = useUserStore((s) => s.setAlert);

  // Both sections start expanded; a section auto-stays open while one of its
  // routes is active even after a manual collapse toggle is flipped back.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
        <div className="w-full">
          <Link href="/home" onClick={onClose} className="mb-4 flex w-full items-center justify-center py-2">
            <img className="h-10 select-none transition duration-500 dark:invert" src="/logo/gravityAssist.svg" alt="Gravity Assist" />
          </Link>

          <ul className="w-full space-y-1 font-medium">
            <li>
              <NavLink item={homeItem} active={pathname.startsWith(homeItem.route)} onClose={onClose} />
            </li>

            {sections.map((section) => {
              const hasActive = section.items.some((i) => pathname.includes(i.route));
              const open = !collapsed[section.label];
              return (
                <li key={section.label} className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [section.label]: !c[section.label] }))}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 transition duration-500 hover:bg-neutral-200/40 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    <span>{section.label}</span>
                    <img
                      className={`size-4 select-none transition-transform duration-300 dark:invert ${open ? "rotate-90" : ""}`}
                      src="/ui/arrowRight.svg"
                      aria-hidden="true"
                    />
                  </button>
                  {(open || hasActive) && (
                    <ul className="mt-1 space-y-1 border-s border-neutral-200 ps-1 dark:border-neutral-800">
                      {section.items.map((item) => (
                        <li key={item.displayName}>
                          <NavLink item={item} active={pathname.includes(item.route)} onClose={onClose} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}

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
        </div>

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
