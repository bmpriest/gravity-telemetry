"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Admin → Users tab. Paginated user list with a search box and a per-row
 * "Reset Password" action that opens a confirmation modal. The reset endpoint
 * returns the new password exactly once; we display it in a modal that the
 * admin must explicitly close, since there is no way to recover it after that.
 */

interface AdminUser {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
  mustChangePassword: boolean;
  createdAt: string;
  lastLoggedIn: string | null;
}

interface Props {
  currentUserId: string;
}

const PAGE_SIZE = 25;

export default function AdminUsers({ currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset-password modal state.
  const [resetTarget, setResetTarget] = useState<AdminUser>();
  const [resetCustomPassword, setResetCustomPassword] = useState("");
  const [resetUseCustom, setResetUseCustom] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetResult, setResetResult] = useState<string>();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load users.");
      setUsers(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  function openReset(user: AdminUser) {
    setResetTarget(user);
    setResetCustomPassword("");
    setResetUseCustom(false);
    setResetError("");
    setResetResult(undefined);
  }

  function closeReset() {
    setResetTarget(undefined);
    setResetResult(undefined);
    setResetError("");
  }

  async function submitReset() {
    if (!resetTarget) return;
    setResetLoading(true);
    setResetError("");
    try {
      const body: { password?: string } = {};
      if (resetUseCustom) {
        if (resetCustomPassword.length < 8) throw new Error("Custom password must be at least 8 characters.");
        body.password = resetCustomPassword;
      }
      const res = await fetch(`/api/admin/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Reset failed.");
      setResetResult(json.password);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setResetLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          placeholder="Search by username..."
          className="fo-input w-full max-w-xs rounded-lg border-neutral-300 bg-white px-3 py-2 text-black transition duration-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
        />
        <p className="text-sm text-neutral-500 transition duration-500 dark:text-neutral-400">
          {loading ? "Loading…" : `${total} user${total === 1 ? "" : "s"} total`}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 transition duration-500 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 transition duration-500 dark:bg-neutral-800">
            <tr className="text-left">
              <th className="p-3 font-medium">Username</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 font-medium">Last seen</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-neutral-100 transition duration-500 dark:border-neutral-800">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.username}</span>
                    {u.mustChangePassword && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        must change pw
                      </span>
                    )}
                    {u.id === currentUserId && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[0.65rem] text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        you
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    u.role === "ADMIN"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-neutral-500 dark:text-neutral-400">
                  {u.lastLoggedIn ? new Date(u.lastLoggedIn).toLocaleDateString() : "—"}
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    className="fo-btn rounded-lg border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium hover:border-amber-400 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900 dark:hover:bg-amber-800"
                    onClick={() => openReset(u)}
                  >
                    Reset password
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800"
          >
            Prev
          </button>
          <span className="text-sm">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800"
          >
            Next
          </button>
        </div>
      )}

      {resetTarget && (
        <div
          className="fixed left-0 top-0 z-30 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]"
          onClick={closeReset}
        >
          <div
            className="flex w-[90vw] max-w-md flex-col gap-3 rounded-2xl bg-white p-6 dark:bg-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            {resetResult ? (
              <>
                <h3 className="text-xl font-bold">Password reset</h3>
                <p className="text-sm">
                  The new password for <b>{resetTarget.username}</b> is shown below.
                  This is the <b>only</b> time it will be displayed — copy it now.
                  The user will be forced to change it on their next login.
                </p>
                <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3 font-mono text-sm break-all dark:border-neutral-600 dark:bg-neutral-900">
                  {resetResult}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                    onClick={() => void navigator.clipboard.writeText(resetResult)}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="fo-btn rounded-lg border-blue-300 bg-blue-100 px-4 py-2 text-sm dark:border-blue-500 dark:bg-blue-800"
                    onClick={closeReset}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold">Reset password for {resetTarget.username}?</h3>
                <p className="text-sm">
                  This will invalidate all of the user&apos;s active sessions and force them
                  to set a new password on their next login.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={resetUseCustom}
                    onChange={(e) => setResetUseCustom(e.target.checked)}
                  />
                  Set a custom password (otherwise a random one is generated)
                </label>
                {resetUseCustom && (
                  <input
                    type="text"
                    value={resetCustomPassword}
                    onChange={(e) => setResetCustomPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="fo-input rounded-lg border-neutral-300 bg-white px-3 py-2 text-sm text-black dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
                  />
                )}
                {resetError && <p className="text-sm text-red-600 dark:text-red-400">{resetError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="fo-btn rounded-lg border-neutral-300 bg-neutral-100 px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                    onClick={closeReset}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={resetLoading}
                    className="fo-btn rounded-lg border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-amber-600 dark:bg-amber-900"
                    onClick={submitReset}
                  >
                    {resetLoading ? "Resetting…" : "Reset password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
