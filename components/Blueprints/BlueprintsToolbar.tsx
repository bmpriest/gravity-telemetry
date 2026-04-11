"use client";

import { useState, useEffect, useRef } from "react";
import BlueprintsSettings from "./BlueprintsSettings";
import BlueprintsSort from "./BlueprintsSort";
import BlueprintsFilter from "./BlueprintsFilter";
import BlueprintsSearch from "./BlueprintsSearch";
import type { ShipSorter, ShipFilter, BlueprintAllShip } from "@/utils/blueprints";
import type { BlueprintAccountDTO } from "@/stores/blueprintStore";

interface Props {
  closeToolbar: boolean;
  data: BlueprintAllShip[] | undefined;
  accounts: BlueprintAccountDTO[];
  accountIndex: number;
  hasUnsavedChanges: boolean;
  onList: () => void;
  onVariants: () => void;
  onExposeModules: () => void;
  onSort: (sorter: ShipSorter | undefined) => void;
  onFilter: (filter: ShipFilter) => void;
  onSearch: (term: string) => void;
  onSave: () => Promise<boolean>;
  onCreateNew: () => void;
  onRename: (accountIndex: number, newName: string) => Promise<boolean>;
  onDelete: (accountIndex: number) => Promise<void>;
}

export default function BlueprintsToolbar({
  closeToolbar,
  data,
  accounts,
  accountIndex,
  hasUnsavedChanges,
  onList,
  onVariants,
  onExposeModules,
  onSort,
  onFilter,
  onSearch,
  onSave,
  onCreateNew,
  onRename,
  onDelete,
}: Props) {
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

  function closeOptions(settings = true, filters = true, sorters = true) {
    if (settings) { setCloseSettings(true); setTimeout(() => setCloseSettings(false), 0); }
    if (filters)  { setCloseFilters(true);  setTimeout(() => setCloseFilters(false), 0); }
    if (sorters)  { setCloseSorters(true);  setTimeout(() => setCloseSorters(false), 0); }
  }

  useEffect(() => {
    if (closeToolbar) closeOptions();
  }, [closeToolbar]);

  // Block accidental tab close while there are unsaved edits.
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); }
    if (hasUnsavedChanges) window.addEventListener("beforeunload", warn);
    else window.removeEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

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

  async function onClickSave() {
    if (!hasUnsavedChanges) return;
    setLoading(true);
    const ok = await onSave();
    setLoading(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1000);
    }
  }

  async function onSubmitRename(e: React.FormEvent) {
    e.preventDefault();
    if (editName === undefined) return;
    setRenameLoading(true);
    const ok = await onRename(editName, newName);
    setRenameLoading(false);
    if (!ok) return;
    setRenameSuccess(true);
    setTimeout(() => {
      setEditName(undefined);
      setNewName("");
      setRenameSuccess(false);
    }, 1000);
  }

  async function onSubmitDelete(e: React.FormEvent) {
    e.preventDefault();
    if (deleteModal === undefined) return;
    setDeleteLoading(true);
    await onDelete(deleteModal);
    setDeleteLoading(false);
    setDeleteSuccess(true);
    setTimeout(() => {
      setDeleteModal(undefined);
      setDeleteSuccess(false);
    }, 1000);
  }

  const editingAccount = editName !== undefined ? accounts.find((a) => a.accountIndex === editName) : undefined;
  const deletingAccount = deleteModal !== undefined ? accounts.find((a) => a.accountIndex === deleteModal) : undefined;

  return (
    <>
      <div
        ref={toolbarRef}
        className={`sticky top-20 z-[2] mt-4 flex flex-wrap items-center justify-center gap-4 rounded-full border-transparent bg-body px-5 py-2 transition duration-500 xl:flex-nowrap ${isSticky ? "shadow dark:border dark:border-neutral-700" : ""}`}
      >
        <BlueprintsSettings
          close={closeSettings}
          data={data}
          accounts={accounts}
          accountIndex={accountIndex}
          hasUnsavedChanges={hasUnsavedChanges}
          onList={onList}
          onVariants={onVariants}
          onExposeModules={onExposeModules}
          onEditName={(acc) => setEditName(acc)}
          onDelete={(acc) => setDeleteModal(acc)}
          onCreateNew={onCreateNew}
        />
        <div onClick={() => closeOptions(true, true, false)}>
          <BlueprintsSort close={closeSorters} onSort={onSort} />
        </div>
        <div onClick={() => closeOptions(true, false, true)}>
          <BlueprintsFilter close={closeFilters} onFilter={onFilter} />
        </div>
        <BlueprintsSearch onSearch={onSearch} />

        <button
          type="button"
          className={`du-btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-blue-300 bg-blue-100 py-2 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700 ${!hasUnsavedChanges ? "pointer-events-none opacity-50 brightness-50" : ""}`}
          onClick={onClickSave}
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

        <p
          className={`absolute -bottom-7 text-nowrap rounded-full bg-body px-3 py-1 opacity-0 transition duration-500 ${
            hasUnsavedChanges ? "opacity-100" : ""
          } ${isSticky ? "shadow dark:border dark:border-neutral-700 dark:shadow-none" : ""}`}
        >
          You have unsaved changes
        </p>
      </div>

      {editingAccount && (
        <div className="fixed left-0 top-0 z-30 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]" onClick={() => setEditName(undefined)}>
          <form
            id="menu"
            className="flex w-[80vw] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 md:w-[30rem] md:p-10 dark:bg-neutral-800"
            onSubmit={onSubmitRename}
            onClick={(e) => e.stopPropagation()}
          >
            <label htmlFor="new-name" className="text-xl font-semibold">
              Rename <span className="text-xl font-bold">{editingAccount.accountName}</span>?
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
              maxLength={50}
            />
            <button
              type="submit"
              className={`du-btn flex h-9 min-h-9 items-center justify-center gap-2 rounded-full border-blue-300 bg-blue-100 py-2 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700 ${newName.length < 1 || newName.length > 50 ? "pointer-events-none opacity-50 brightness-50" : ""}`}
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

      {deletingAccount && (
        <div className="fixed left-0 top-0 z-30 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]" onClick={() => setDeleteModal(undefined)}>
          <form
            id="menu"
            className="flex w-[80vw] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 md:w-[30rem] md:p-10 dark:bg-neutral-800"
            onSubmit={onSubmitDelete}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold">
              Delete <span className="text-xl font-bold">{deletingAccount.accountName}</span>?
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
