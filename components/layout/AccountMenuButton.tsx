"use client";

/**
 * Navbar account switcher. Players commonly run several Infinite Lagrange
 * accounts and track each one's blueprint unlocks and fleets separately, so the
 * active account is a global concept surfaced right next to the username.
 *
 * The account registry lives in `blueprintStore.accounts` (server-backed when
 * logged in, localStorage when anonymous); this component only reads that list
 * and drives the shared selection / mutations through `accountStore`, which
 * keeps the blueprint and fleet stores aligned. Works logged out — accounts and
 * their data persist to localStorage just like fleets do.
 */

import { useState, useEffect, useRef } from "react";
import { useBlueprintStore } from "@/stores/blueprintStore";
import {
  useAccountStore,
  withDefaultAccount,
  MAX_ACCOUNTS,
} from "@/stores/accountStore";

type ModalState =
  | { mode: "create" }
  | { mode: "rename"; index: number; name: string }
  | { mode: "delete"; index: number; name: string }
  | undefined;

export default function AccountMenuButton() {
  const accountsRaw = useBlueprintStore((s) => s.accounts);
  const activeIndex = useAccountStore((s) => s.activeIndex);
  const setActiveIndex = useAccountStore((s) => s.setActiveIndex);
  const createAccount = useAccountStore((s) => s.createAccount);
  const renameAccount = useAccountStore((s) => s.renameAccount);
  const deleteAccount = useAccountStore((s) => s.deleteAccount);

  const accounts = withDefaultAccount(accountsRaw);
  const activeAccount =
    accounts.find((a) => a.accountIndex === activeIndex) ?? accounts[0];
  // Before any account is persisted there's nothing to switch to, so the
  // button invites creating the first one rather than showing the synthetic
  // placeholder name.
  const hasAccounts = accountsRaw.length > 0;

  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside to close, matching UserMenuButton's lightweight pattern.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function openCreate() {
    setName("");
    setModal({ mode: "create" });
    setOpen(false);
  }

  function openRename(index: number, current: string) {
    setName(current);
    setModal({ mode: "rename", index, name: current });
    setOpen(false);
  }

  function openDelete(index: number, current: string) {
    setModal({ mode: "delete", index, name: current });
    setOpen(false);
  }

  function closeModal() {
    if (busy) return;
    setModal(undefined);
    setName("");
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!modal) return;
    setBusy(true);
    try {
      if (modal.mode === "create") {
        await createAccount(name.trim());
      } else if (modal.mode === "rename") {
        await renameAccount(modal.index, name.trim());
      } else if (modal.mode === "delete") {
        await deleteAccount(modal.index);
      }
    } finally {
      setBusy(false);
      setModal(undefined);
      setName("");
    }
  }

  const atCap = accountsRaw.length >= MAX_ACCOUNTS;
  const nameValid = name.trim().length >= 1 && name.trim().length <= 50;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => (hasAccounts ? setOpen((v) => !v) : openCreate())}
        className="btn flex items-center gap-2 rounded-lg border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        aria-haspopup="menu"
        aria-expanded={open}
        title={hasAccounts ? `Account: ${activeAccount.accountName}` : "Add account"}
      >
        <img className="size-4 transition duration-500 dark:invert" src={hasAccounts ? "/ui/person.svg" : "/ui/plusCircle.svg"} aria-hidden="true" />
        <span className="max-w-[8rem] truncate">{hasAccounts ? activeAccount.accountName : "Add account"}</span>
        {hasAccounts && (
          <svg className="size-4 transition" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {open && hasAccounts && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg transition duration-300 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Accounts
          </p>

          {accounts.map((acc) => {
            const isActive = acc.accountIndex === activeIndex;
            return (
              <div
                key={acc.accountIndex}
                className={`flex items-center gap-1 px-2 py-1 ${isActive ? "bg-neutral-100 dark:bg-neutral-700" : ""}`}
              >
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    setActiveIndex(acc.accountIndex);
                    setOpen(false);
                  }}
                  className="flex grow items-center gap-2 truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <span className={`size-2 shrink-0 rounded-full ${isActive ? "bg-[#794dff]" : "bg-transparent"}`} aria-hidden="true" />
                  <span className="truncate">{acc.accountName}</span>
                </button>

                {/* Rename / delete are only meaningful for persisted accounts. */}
                {accountsRaw.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => openRename(acc.accountIndex, acc.accountName)}
                      className="rounded-lg p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                      title={`Rename ${acc.accountName}`}
                    >
                      <img className="size-4 transition duration-500 dark:invert" src="/ui/pencil.svg" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(acc.accountIndex, acc.accountName)}
                      className="rounded-lg p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                      title={`Delete ${acc.accountName}`}
                    >
                      <img className="size-4 transition duration-500 dark:invert" src="/ui/trash.svg" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            );
          })}

          <div className="border-t border-neutral-200 dark:border-neutral-700" />

          <button
            type="button"
            role="menuitem"
            onClick={openCreate}
            disabled={atCap}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-700"
            title={atCap ? `You can have at most ${MAX_ACCOUNTS} accounts.` : "Add account"}
          >
            <img className="size-4 transition duration-500 dark:invert" src="/ui/plusCircle.svg" aria-hidden="true" />
            Add account
          </button>
        </div>
      )}

      {modal && (
        <div
          className="fixed left-0 top-0 z-40 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]"
          onClick={closeModal}
        >
          <form
            className="flex w-[80vw] flex-col items-center justify-center gap-3 rounded-2xl bg-white p-4 md:w-[30rem] md:p-10 dark:bg-neutral-800"
            onSubmit={(e) => void onSubmit(e)}
            onClick={(e) => e.stopPropagation()}
          >
            {modal.mode === "delete" ? (
              <>
                <h3 className="text-center text-xl font-semibold">
                  Delete <span className="font-bold">{modal.name}</span>?
                </h3>
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                  This removes the account&apos;s blueprint progress and its saved fleets.
                </p>
                <button
                  type="submit"
                  className="btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-red-300 bg-red-100 py-2 transition duration-500 hover:scale-105 hover:border-red-400 hover:bg-red-200 dark:border-red-500 dark:bg-red-800 dark:hover:bg-red-700"
                >
                  <span>{busy ? "Deleting" : "Delete"}</span>
                  {busy ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <img className="size-5 transition duration-500 dark:invert" src="/ui/trash.svg" aria-hidden="true" />
                  )}
                </button>
              </>
            ) : (
              <>
                <label htmlFor="account-name" className="text-center text-xl font-semibold">
                  {modal.mode === "create" ? "New account" : <>Rename <span className="font-bold">{modal.name}</span></>}
                </label>
                <input
                  id="account-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  className="search-input input grow rounded-full text-left text-black transition duration-500 placeholder:transition placeholder:duration-500 dark:text-white dark:placeholder:text-neutral-300"
                  placeholder="Enter account name"
                  required
                  minLength={1}
                  maxLength={50}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!nameValid || busy}
                  className="btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-blue-300 bg-blue-100 py-2 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 disabled:pointer-events-none disabled:opacity-50 disabled:brightness-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
                >
                  <span>{busy ? "Saving" : "Save"}</span>
                  {busy ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <img className="size-5 transition duration-500 dark:invert" src="/ui/save.svg" aria-hidden="true" />
                  )}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
