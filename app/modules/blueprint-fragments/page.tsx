"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import FragmentsCard from "@/components/Blueprints/Fragments/FragmentsCard";
import { useUserStore } from "@/stores/userStore";
import { useBlueprintStore, type BlueprintAccountDTO } from "@/stores/blueprintStore";
import { useAccountStore } from "@/stores/accountStore";
import { buildView, viewToShipEntries, type BlueprintAllShip } from "@/utils/blueprints";
import { formatDate } from "@/utils/functions";

interface UserFragment {
  fragmentId: number;
  quantityOwned: number;
}

// Heaviest-to-lightest, mirroring the Blueprint Tracker's grouping (Fighter
// kept ahead of Corvette so aircraft don't sort to the very bottom).
const displayOrder = ["Battleship", "Carrier", "Auxiliary Ship", "Battlecruiser", "Cruiser", "Destroyer", "Frigate", "Fighter", "Corvette"] as const;

export default function BlueprintFragmentsPage() {
  const authChecked = useUserStore((s) => s.authChecked);
  const shipData = useUserStore((s) => s.shipData);
  const init = useUserStore((s) => s.init);

  const accounts = useBlueprintStore((s) => s.accounts);
  const saveAccount = useBlueprintStore((s) => s.saveAccount);
  const createDraftAccount = useBlueprintStore((s) => s.createDraftAccount);

  const accountIndex = useAccountStore((s) => s.activeIndex);
  const setActiveIndex = useAccountStore((s) => s.setActiveIndex);

  const [draftAccount, setDraftAccount] = useState<BlueprintAccountDTO>();
  const [data, setData] = useState<BlueprintAllShip[]>();
  const [userFragments, setUserFragments] = useState<UserFragment[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [fragmentNames, setFragmentNames] = useState<Map<number, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // shipData is normally hydrated by the app shell; load it if we arrived here directly.
  useEffect(() => {
    if (!shipData) init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Public fragment dictionary for names (admin endpoint 403s for normal users).
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/fragments");
        const { success, data: defs } = await res.json();
        if (success && Array.isArray(defs)) {
          setFragmentNames(new Map(defs.map((d: { id: number; name: string }) => [d.id, d.name])));
        }
      } catch (e) {
        console.error("Failed to load fragment names", e);
      }
    }
    void load();
  }, []);

  // Project the active account into the editable view. The view spans ALL ships
  // (not just fragment ones) so saving doesn't drop the account's tech-point or
  // module progress recorded on the Blueprint Tracker.
  useEffect(() => {
    if (!shipData || !authChecked) return;

    // Fresh user with no saved account → seed an empty draft so the page is usable.
    // Syncing local editable state from the zustand store (an external store) is
    // exactly what this effect is for; the writes are guarded by the deps below.
    if (accounts.length === 0) {
      const draft = createDraftAccount();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftAccount(draft);
      setData(buildView(shipData, draft));
      setUserFragments([]);
      setHasUnsavedChanges(false);
      return;
    }

    const target = accounts.find((a) => a.accountIndex === accountIndex) ?? accounts[0];
    if (target.accountIndex !== accountIndex) {
      setActiveIndex(target.accountIndex);
      return;
    }
    setDraftAccount(target);
    setData(buildView(shipData, target));
    setUserFragments([...(target.userFragments ?? [])]);
    setHasUnsavedChanges(false);
  }, [accounts, accountIndex, shipData, authChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before leaving with unsaved edits, matching the tracker's behaviour.
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) { e.preventDefault(); }
    if (hasUnsavedChanges) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  const fragmentShips = useMemo(() => (data ?? []).filter((s) => s.isFragmentUnlocked), [data]);

  const setOwned = useCallback((fragmentId: number, qty: number) => {
    setUserFragments((prev) => {
      const idx = prev.findIndex((f) => f.fragmentId === fragmentId);
      if (idx !== -1) return prev.map((f) => (f.fragmentId === fragmentId ? { ...f, quantityOwned: qty } : f));
      return [...prev, { fragmentId, quantityOwned: qty }];
    });
    setHasUnsavedChanges(true);
  }, []);

  const unlock = useCallback((ship: BlueprintAllShip) => {
    const reqs = ship.fragments ?? [];
    // Consume the required count from the shared inventory.
    setUserFragments((prev) =>
      prev.map((f) => {
        const req = reqs.find((r) => r.fragmentId === f.fragmentId);
        return req ? { ...f, quantityOwned: Math.max(0, f.quantityOwned - req.quantityRequired) } : f;
      }),
    );
    ship.unlocked = true;
    setData((prev) => (prev ? [...prev] : prev));
    setHasUnsavedChanges(true);
  }, []);

  const toggleOwned = useCallback((ship: BlueprintAllShip) => {
    // Manual flip — does not touch fragment counts in either direction.
    ship.unlocked = !ship.unlocked;
    setData((prev) => (prev ? [...prev] : prev));
    setHasUnsavedChanges(true);
  }, []);

  const onSave = useCallback(async () => {
    if (!draftAccount || !data) return;
    setSaving(true);
    // Spread draftAccount first to preserve unassignedTp; override ships from the
    // full view and persist the updated fragment inventory.
    const account: BlueprintAccountDTO = {
      ...draftAccount,
      ships: viewToShipEntries(data),
      userFragments,
    };
    const result = await saveAccount(account);
    setSaving(false);
    if (result) {
      setDraftAccount(result);
      setHasUnsavedChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  }, [draftAccount, data, userFragments, saveAccount]);

  const lastSaved = draftAccount?.lastSaved && draftAccount.lastSaved !== ""
    ? formatDate(draftAccount.lastSaved, "full", true)
    : undefined;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] w-full flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-[80rem]">
        <p className="text-neutral-600 transition duration-500 dark:text-neutral-400">
          Blueprints unlocked by collecting fragments. Record the fragments you own, then unlock the blueprint once you have enough.
        </p>
        {lastSaved && <p className="mt-2 text-sm transition duration-500">Last updated: {lastSaved}</p>}

        {data ? (
          fragmentShips.length === 0 ? (
            <p className="mt-16 text-neutral-500 transition duration-500">No fragment-unlocked blueprints found.</p>
          ) : (
            <div className="mt-6 flex flex-col gap-8">
              {displayOrder.map((type) => {
                const ships = fragmentShips.filter((s) => s.type === type);
                if (ships.length === 0) return null;
                const unlocked = ships.filter((s) => s.unlocked).length;
                return (
                  <section key={type} className="flex w-full flex-col">
                    <h2 className="mb-3 flex items-center gap-2 text-xl font-bold transition duration-500">
                      <img className="size-7 select-none transition duration-500 dark:invert" src={`/ships/classes/${type.toLowerCase()}.svg`} alt="" />
                      {type}s
                      <span className="text-sm font-normal text-neutral-500 transition duration-500 dark:text-neutral-400">{unlocked}/{ships.length} unlocked</span>
                    </h2>
                    <div className="flex flex-wrap items-start justify-start gap-3">
                      {ships.map((ship) => (
                        <FragmentsCard
                          key={ship.id}
                          ship={ship}
                          fragmentNames={fragmentNames}
                          userFragments={userFragments}
                          onSetOwned={setOwned}
                          onUnlock={() => unlock(ship)}
                          onToggleOwned={() => toggleOwned(ship)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-animated h-24 w-80 rounded-2xl bg-neutral-100 transition duration-500 dark:bg-neutral-900" />
            ))}
          </div>
        )}
      </div>

      {/* Floating save — there is no toolbar on this page. */}
      {hasUnsavedChanges && (
        <button
          type="button"
          onClick={() => void onSave()}
          className="btn fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border-blue-300 bg-blue-100 px-6 py-3 font-semibold text-black shadow-lg transition duration-500 hover:scale-105 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
        >
          {saving ? <span className="loading loading-spinner loading-sm" /> : <img className="size-5 transition duration-500 dark:invert" src="/ui/save.svg" aria-hidden="true" />}
          <span>{saving ? "Saving" : "Save changes"}</span>
        </button>
      )}

      {saved && (
        <div className="fixed bottom-6 right-6 z-30 rounded-full bg-green-100 px-6 py-3 font-semibold text-green-800 shadow-lg transition duration-500 dark:bg-green-800 dark:text-green-100">
          Saved!
        </div>
      )}
    </div>
  );
}
