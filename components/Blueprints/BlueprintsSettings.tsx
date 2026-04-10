"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore, type AccountSummary } from "@/stores/userStore";

interface Props {
  close: boolean;
  accounts: AccountSummary[] | undefined;
  isOwner: boolean | undefined;
  onList: () => void;
  onVariants: () => void;
  onExposeModules: () => void;
  onEditName: (accountIndex: number) => void;
  onDelete: (accountIndex: number) => void;
  onCreateNew: () => void;
}

export default function BlueprintsSettings({ close, accounts, isOwner, onList, onVariants, onExposeModules, onEditName, onDelete, onCreateNew }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUserStore((s) => s.user);
  const isUnsavedAccount = useUserStore((s) => s.isUnsavedAccount);

  const [showSettings, setShowSettings] = useState(false);
  const [listOn, setListOn] = useState(false);
  const [variantsOff, setVariantsOff] = useState(false);
  const [modulesExposed, setModulesExposed] = useState(false);

  useEffect(() => {
    setListOn(localStorage.getItem("layout") === "list");
    setVariantsOff(localStorage.getItem("variants") !== "true");
    setModulesExposed(localStorage.getItem("modules") === "true");
  }, []);

  useEffect(() => {
    if (close) setShowSettings(false);
  }, [close]);

  const accountCount = accounts?.length ?? 0;
  const aQuery = searchParams.get("a");

  function goToAccount(index: number) {
    if (isUnsavedAccount) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", index.toString());
    router.push(`/modules/blueprint-tracker?${params.toString()}`);
  }

  const switchStyle = {
    boxShadow: "var(--handleoffsetcalculator) 0 0 4px var(--bg-color) inset, 0 0 0 4px var(--bg-color) inset, var(--switchhandleborder)",
  };

  return (
    <div className="relative flex flex-col items-start justify-start rounded-xl">
      <button
        className={`flex h-9 w-9 select-none items-center justify-center rounded-full border bg-white p-0 transition duration-500 lg:w-32 lg:justify-start lg:p-2 lg:px-4 dark:bg-neutral-800 ${
          showSettings
            ? "border-2 border-[#794dff] shadow-sm shadow-[#794dff38] ring-0 ring-[#794dff]"
            : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-700"
        }`}
        type="button"
        onClick={() => setShowSettings(!showSettings)}
      >
        <img className="size-5 transition duration-500 dark:invert" src="/ui/settings.svg" aria-hidden="true" />
        <p className="hidden grow transition duration-500 lg:block">Options</p>
      </button>

      {showSettings && (
        <div className="absolute top-10 z-[2] flex w-72 flex-col items-start justify-center gap-3 rounded-xl border-2 border-neutral-200 bg-white p-3 shadow-md transition duration-500 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex w-full items-center justify-center gap-2">
            <label className="transition duration-500" htmlFor="layoutType">Grid View</label>
            <input
              id="layoutType"
              type="checkbox"
              className="fo-switch fo-switch-primary fo-switch-outline border-neutral-200 bg-neutral-900 transition duration-500 hover:border-neutral-400 hover:duration-200 dark:border-neutral-700 dark:bg-neutral-100 dark:hover:border-neutral-600"
              checked={listOn}
              style={switchStyle}
              onChange={() => { setListOn((v) => !v); onList(); }}
            />
            <label className="transition duration-500" htmlFor="layoutType">List View</label>
          </div>

          <div className="flex w-full items-center justify-center gap-2">
            <label className="transition duration-500" htmlFor="variantsType">Show Variants</label>
            <input
              id="variantsType"
              type="checkbox"
              className="fo-switch fo-switch-primary fo-switch-outline border-neutral-200 bg-neutral-900 transition duration-500 hover:border-neutral-400 hover:duration-200 dark:border-neutral-700 dark:bg-neutral-100 dark:hover:border-neutral-600"
              checked={variantsOff}
              style={switchStyle}
              onChange={() => { setVariantsOff((v) => !v); onVariants(); }}
            />
            <label className="transition duration-500" htmlFor="variantsType">Hide Variants</label>
          </div>

          <div className="flex w-full items-center justify-center gap-2">
            <label className="transition duration-500" htmlFor="modulesType">Hide Modules</label>
            <input
              id="modulesType"
              type="checkbox"
              className="fo-switch fo-switch-primary fo-switch-outline border-neutral-200 bg-neutral-900 transition duration-500 hover:border-neutral-400 hover:duration-200 dark:border-neutral-700 dark:bg-neutral-100 dark:hover:border-neutral-600"
              checked={modulesExposed}
              style={switchStyle}
              onChange={() => { setModulesExposed((v) => !v); onExposeModules(); }}
            />
            <label className="transition duration-500" htmlFor="modulesType">Expose Modules</label>
          </div>

          {isOwner && accounts && (
            <div className="mt-4 flex w-full flex-col items-center justify-center">
              <h3 className="text-lg font-semibold transition duration-500">Account Switcher</h3>
              <p className="mb-2 text-sm transition duration-500">{accountCount}/10 accounts</p>

              <ol className="flex w-full flex-col items-center justify-start gap-1">
                {accounts.map((account) => (
                  <li
                    key={account.accountIndex}
                    className={`w-full ${isUnsavedAccount && aQuery !== account.accountIndex.toString() ? "du-tooltip" : ""}`}
                    data-tip="Save your current account first!"
                  >
                    <button
                      className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg py-1 transition duration-500 hover:duration-300 ${
                        aQuery === account.accountIndex.toString()
                          ? "bg-neutral-200 hover:bg-neutral-300/75 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                          : "bg-neutral-100/25 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                      } ${isUnsavedAccount && aQuery !== account.accountIndex.toString() ? "pointer-events-none opacity-50" : ""}`}
                      type="button"
                      onClick={() => goToAccount(account.accountIndex)}
                    >
                      {user && (
                        <h5 className="inline-flex items-center justify-center font-medium transition duration-500">
                          {account.accountName}
                          <span className="du-tooltip ms-2" data-tip="Edit Name">
                            <button
                              className="fo-btn fo-btn-circle fo-btn-text size-6 min-h-6"
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onEditName(account.accountIndex); }}
                            >
                              <img className="size-4 select-none transition duration-500 dark:invert" src="/ui/pencil.svg" alt="Edit account name" />
                            </button>
                          </span>
                          {accountCount > 1 && (
                            <span className="du-tooltip" data-tip="Delete">
                              <button
                                className="fo-btn fo-btn-circle fo-btn-text size-6 min-h-6"
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDelete(account.accountIndex); }}
                              >
                                <img className="size-4 select-none transition duration-500 dark:invert" src="/ui/trash.svg" alt="Delete account" />
                              </button>
                            </span>
                          )}
                        </h5>
                      )}
                    </button>
                  </li>
                ))}
              </ol>

              {!isUnsavedAccount && accountCount < 10 && (
                <button
                  className="mt-1 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg py-2 transition hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  type="button"
                  onClick={onCreateNew}
                >
                  <h5 className="inline-flex items-center justify-center gap-2 font-medium transition duration-500">
                    <img className="size-6 select-none transition duration-500 dark:invert" src="/ui/plusCircle.svg" aria-hidden="true" />
                    Create New
                  </h5>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
