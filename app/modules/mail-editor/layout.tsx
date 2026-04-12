"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Edit", src: "/ui/pencil.svg", route: "/modules/mail-editor/edit" },
  { name: "Saved Mails", src: "/ui/saved.svg", route: "/modules/mail-editor/saved" },
];

export default function MailEditorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-start p-8">
      <div className="flex w-full flex-col items-center justify-center md:w-[25rem] lg:w-[30rem]">
        <div role="tablist" className="du-tabs du-tabs-bordered w-full">
          {tabs.map((tab) => (
            <Link
              key={tab.route}
              href={tab.route}
              role="tab"
              className={`du-tab flex items-center justify-center gap-2 transition duration-500 dark:text-white ${pathname === tab.route ? "du-tab-active" : ""}`}
            >
              <img className="size-5 select-none transition duration-500 dark:invert" src={tab.src} aria-hidden="true" />
              {tab.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-4 w-full">{children}</div>
    </div>
  );
}
