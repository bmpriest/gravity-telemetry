"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BlueprintsSettings from "./BlueprintsSettings";
import BlueprintsSort from "./BlueprintsSort";
import BlueprintsFilter from "./BlueprintsFilter";
import BlueprintsSearch from "./BlueprintsSearch";
import { useUserStore, type AccountSummary } from "@/stores/userStore";
import type { ShipSorter, ShipFilter } from "@/utils/blueprints";

interface SavePayload {
  ships: Array<{ shipId: number; techPoints: number; moduleSystems: string[] }>;
  unassignedTp: Record<string, number>;
}

interface Props {
  closeToolbar: boolean;
  accounts: AccountSummary[] | undefined;
  isOwner: boolean | undefined;
  accountIndex: number;
  buildSavePayload: () => SavePayload;
  onList: () => void;
  onVariants: () => void;
  onExposeModules: () => void;
  onSort: (sorter: ShipSorter | undefined) => void;
  onFilter: (filter: ShipFilter) => void;
  onSearch: (term: string) => void;
}

export default function BlueprintsToolbar({
  closeToolbar,
  accounts,
  isOwner,
  accountIndex,
  buildSavePayload,
  onList,
  onVariants,
  onExposeModules,
  onSort,
  onFilter,
  onSearch,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const setBlueprintAccounts = useUserStore((s) => s.setBlueprintAccounts);
  const hasUnsavedChanges = useUserStore((s) => s.hasUnsavedChanges);
  const setHasUnsavedChanges = useUserStore((s) => s.setHasUnsavedChanges);
  const isUnsavedAccount = useUserStore((s) => s.isUnsavedAccount);
  const setIsUnsavedAccount = useUserStore((s) => s.setIsUnsavedAccount);
  const setCreateNewAccount = useUserStore((s) => s.setCreateNewAccount);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameSuccess, setRenameSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [editName, setEditName] = useState<number>();
  const [deleteModal, setDeleteModal] = useState<number>();
  const [newName, setNewName] = useState("");

  const [closeSettings, setCloseSettings] = useState(false);
  const [closeFilters, setCloseFilters] = useState(false);
  const [closeSorters, setCloseSorters] = useState(false);

  const accountCount = accounts?.length ?? 0;

  function getAccountName(index: number): string {
    return accounts?.find((a) => a.accountIndex === index)?.accountName ?? "Unnamed";
  }

  async function closeOptions(settings = true, filters = true, sorters = true) {
    if (settings) { setCloseSettings(true); setTimeout(() => setCloseSettings(false), 0); }
    if (filters) { setCloseFilters(true); setTimeout(() => setCloseFilters(false), 0); }
    if (sorters) { setCloseSorters(true); setTimeout(() => setCloseSorters(false), 0); }
  }

  useEffect(() => {
    if (closeToolbar) void closeOptions();
  }, [closeToolbar]);

  useEffect(() => {
    function warnForUnsavedChanges(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    if (hasUnsavedChanges && isOwner) {
      window.addEventListener("beforeunload", warnForUnsavedChanges);
    } else {
      window.removeEventListener("beforeunload", warnForUnsavedChanges);
    }
    return () => window.removeEventListener("beforeunload", warnForUnsavedChanges);
  }, [hasUnsavedChanges, isOwner]);

  useEffect(() => {
    let previousPosition = 0;
    function detectSticky() {
      if (!toolbarRef.current) return;
      const newPosition = toolbarRef.current.getBoundingClientRect().top;
      if (newPosition === previousPosition) { setIsSticky(true); return; }
      previousPosition = newPosition;
      setIsSticky(false);
    }
    window.addEventListener("scroll", detectSticky);
    return () => window.removeEventListener("scroll", detectSticky);
  }, []);

  function createNewAccount() {
    if (!user) return;
    setCreateNewAccount(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", String(accountCount));
    router.push(`/modules/blueprint-tracker?${params.toString()}`);
  }

  async function saveBlueprints() {
    if (!user || !hasUnsavedChanges) return;
    setLoading(true);
    const payload = buildSavePayload();
    const accountName = getAccountName(accountIndex);
    const res = await fetch("/api/blueprints/save", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountIndex,
        accountName,
        ships: payload.ships,
        unassignedTp: payload.unassignedTp,
      }),
    });
    const { success: ok, error, accounts: newAccounts } = await res.json();
    setLoading(false);
    if (!ok && error) { console.error(error); return; }
    if (ok) {
      setSuccess(true);
      setIsUnsavedAccount(false);
      setTimeout(() => {
        setHasUnsavedChanges(false);
        if (newAccounts) setBlueprintAccounts(newAccounts);
        setSuccess(false);
      }, 1000);
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!user || editName === undefined) return;
    setRenameLoading(true);
    const res = await fetch("/api/blueprints/save", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountIndex: editName,
        accountName: newName,
        ships: null,
      }),
    });
    const { success: ok, error, accounts: newAccounts } = await res.json();
    setRenameLoading(false);
    if (!ok && error) { console.error(error); return; }

    setRenameSuccess(true);
    setTimeout(() => {
      setEditName(undefined);
      setNewName("");
      if (newAccounts) setBlueprintAccounts(newAccounts);
      setRenameSuccess(false);
    }, 1000);
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!user || deleteModal === undefined) return;
    setDeleteLoading(true);
    const res = await fetch("/api/blueprints/delete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountIndex: deleteModal,
      }),
    });
    const { success: ok, error, accounts: newAccounts } = await res.json();
    setDeleteLoading(false);
    if (!ok && error) { console.error(error); return; }

    setDeleteSuccess(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", String(Math.max(0, accountCount - 2)));
    router.replace(`/modules/blueprint-tracker?${params.toString()}`);

    setTimeout(() => {
      setDeleteModal(undefined);
      if (newAccounts) setBlueprintAccounts(newAccounts);
      setDeleteSuccess(false);
    }, 1000);
  }

  return (
    <>
      <div
        ref={toolbarRef}
        className={`sticky top-20 z-[2] mt-4 flex flex-wrap items-center justify-center gap-4 rounded-full border-transparent bg-body px-5 py-2 transition duration-500 xl:flex-nowrap ${isSticky ? "shadow dark:border dark:border-neutral-700" : ""}`}
      >
        <BlueprintsSettings
          close={closeSettings}
          accounts={accounts}
          isOwner={isOwner}
          onList={onList}
          onVariants={onVariants}
          onExposeModules={onExposeModules}
          onEditName={(acc) => setEditName(acc)}
          onDelete={(acc) => setDeleteModal(acc)}
          onCreateNew={createNewAccount}
        />
        <div onClick={() => void closeOptions(true, true, false)}>
          <BlueprintsSort close={closeSorters} onSort={onSort} />
        </div>
        <div onClick={() => void closeOptions(true, false, true)}>
          <BlueprintsFilter close={closeFilters} onFilter={onFilter} />
        </div>
        <BlueprintsSearch onSearch={onSearch} />

        {isOwner && user && (
          <button
            type="button"
            className={`du-btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-blue-300 bg-blue-100 py-2 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700 ${!hasUnsavedChanges ? "pointer-events-none opacity-50 brightness-50" : ""}`}
            onClick={saveBlueprints}
          >
            <span className="hidden transition duration-500 sm:inline-flex md:hidden lg:inline-flex">
              {success ? "Saved!" : loading ? "Saving" : "Save"}
            </span>
            {!loading ? (
              <img className="size-5 transition duration-500 dark:invert" src="/ui/save.svg" aria-hidden="true" />
            ) : (
              <span className="fo-loading fo-loading-spinner fo-loading-sm" />
            )}
          </button>
        )}

        <p
          className={`absolute -bottom-7 text-nowrap rounded-full bg-body px-3 py-1 opacity-0 transition duration-500 ${
            (user && hasUnsavedChanges) || !user ? "opacity-100" : ""
          } ${isSticky ? "shadow dark:border dark:border-neutral-700 dark:shadow-none" : ""}`}
        >
          {!user ? "Log in to sync your blueprints across devices" : "You have unsaved changes"}
        </p>
      </div>

      {editName !== undefined && user && (
        <div className="fixed left-0 top-0 z-30 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]" onClick={() => setEditName(undefined)}>
          <form
            id="menu"
            className="flex w-[80vw] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 md:w-[30rem] md:p-10 dark:bg-neutral-800"
            onSubmit={rename}
            onClick={(e) => e.stopPropagation()}
          >
            <label htmlFor="new-name" className="text-xl font-semibold">
              Rename <span className="text-xl font-bold">{getAccountName(editName)}</span>?
            </label>
            <input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              type="text"
              className="search-input fo-input grow rounded-full text-left text-black transition duration-500 placeholder:transition placeholder:duration-500 dark:text-white dark:placeholder:text-neutral-300"
              placeholder="Enter new account name"
              required
              minLength={1}
              maxLength={20}
            />
            <button
              type="submit"
              className={`du-btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-blue-300 bg-blue-100 py-2 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700 ${newName.length < 1 || newName.length > 20 ? "pointer-events-none opacity-50 brightness-50" : ""}`}
            >
              <span className="hidden transition duration-500 sm:inline-flex md:hidden lg:inline-flex">
                {renameSuccess ? "Saved!" : renameLoading ? "Saving" : "Save"}
              </span>
              {!renameLoading ? (
                <img className="size-5 transition duration-500 dark:invert" src="/ui/save.svg" aria-hidden="true" />
              ) : (
                <span className="fo-loading fo-loading-spinner fo-loading-sm" />
              )}
            </button>
          </form>
        </div>
      )}

      {deleteModal !== undefined && user && (
        <div className="fixed left-0 top-0 z-30 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]" onClick={() => setDeleteModal(undefined)}>
          <form
            id="menu"
            className="flex w-[80vw] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 md:w-[30rem] md:p-10 dark:bg-neutral-800"
            onSubmit={deleteAccount}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold">
              Delete <span className="text-xl font-bold">{getAccountName(deleteModal)}</span>?
            </h3>
            <button
              type="submit"
              className="du-btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-blue-300 bg-blue-100 py-2 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
            >
              <span className="hidden transition duration-500 sm:inline-flex md:hidden lg:inline-flex">
                {deleteSuccess ? "Deleted!" : deleteLoading ? "Deleting" : "Delete"}
              </span>
              {!deleteLoading ? (
                <img className="size-5 transition duration-500 dark:invert" src="/ui/trash.svg" aria-hidden="true" />
              ) : (
                <span className="fo-loading fo-loading-spinner fo-loading-sm" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
