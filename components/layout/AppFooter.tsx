"use client";

import { useRouter } from "next/navigation";
import { changelog } from "@/utils/changelog";

export default function AppFooter() {
  const router = useRouter();
  const latest = changelog[changelog.length - 1];

  function openChangelog() {
    router.push(`?v=${latest.version}`);
  }

  return (
    <footer className="fo-footer w-full bg-neutral-100 px-10 py-4 transition duration-500 dark:bg-neutral-800" style={{ transition: "background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}>
      <div className="flex w-full items-center justify-center">
        <div className="flex w-1/6 items-center justify-start gap-1 text-xl font-bold sm:w-1/4 md:w-1/3 lg:w-1/4">
          <img className="size-8 select-none" src="/logo/logo.svg" aria-hidden="true" />
          <img className="hidden h-8 select-none transition duration-500 sm:block dark:invert" src="/logo/gravityAssist.svg" aria-hidden="true" />
        </div>
        <aside className="flex w-4/6 items-center justify-center sm:w-1/2 md:w-1/3 lg:w-1/2">
          <p className="text-center transition duration-500">
            Gravity Assist{" "}
            <button
              type="button"
              className="text-lg font-semibold no-underline transition duration-500 hover:underline hover:duration-150 dark:hover:text-white"
              onClick={openChangelog}
            >
              v{latest.version}
            </button>{" "}
            by bmpriest/DubNubz
          </p>
        </aside>
        {/* <div className="flex h-5 w-1/6 justify-end gap-4 sm:w-1/4 md:w-1/3 lg:w-1/4">
          <a href="https://github.com/kennething/gravity-assist" target="_blank" rel="noopener noreferrer" className="fo-link" aria-label="GitHub Link">
            <img className="size-6 select-none transition duration-500 dark:invert" src="/logo/github.svg" aria-hidden="true" />
          </a>
          <a href="https://discord.com/invite/9mJ9b2Bbzx" target="_blank" rel="noopener noreferrer" className="fo-link" aria-label="Discord Link">
            <img className="size-6 select-none transition duration-500 dark:invert" src="/logo/discord.svg" aria-hidden="true" />
          </a>
        </div> */}
      </div>
    </footer>
  );
}
