"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface EditUserFormProps {
  userId: string;
  username: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  isSelf: boolean;
}

export default function EditUserForm({ userId, username, isAdmin, mustChangePassword, isSelf }: EditUserFormProps) {
  const router = useRouter();
  const [admin, setAdmin] = useState(isAdmin);
  const [resetPw, setResetPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setSuccess("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!body?.success) {
      setError(body?.error ?? "Update failed");
      return false;
    }
    setSuccess("Saved.");
    router.refresh();
    return true;
  }

  async function onSaveAdmin() {
    if (busy) return;
    await patch({ isAdmin: admin });
  }

  async function onReset() {
    if (busy || resetPw.length < 8) return;
    const ok = await patch({ resetPassword: resetPw });
    if (ok) setResetPw("");
  }

  async function onDelete() {
    if (deleting) return;
    if (!confirm(`Delete user "${username}"? All their saves and blueprints will be removed.`)) return;
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
    const body = await res.json().catch(() => null);
    setDeleting(false);
    if (!body?.success) {
      setError(body?.error ?? "Delete failed");
      return;
    }
    router.push("/admin/users");
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-neutral-600 transition duration-500 dark:text-neutral-400">
        Created username <b>{username}</b>. Must change password: {mustChangePassword ? "yes" : "no"}.
      </p>

      <section className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
        <h3 className="text-lg font-semibold">Admin role</h3>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} disabled={isSelf} className="size-5" />
          <span>Admin</span>
        </label>
        {isSelf && <p className="text-xs text-neutral-600 dark:text-neutral-400">Cannot revoke your own admin.</p>}
        <button
          type="button"
          onClick={onSaveAdmin}
          disabled={busy || admin === isAdmin}
          className="self-start rounded-xl border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium transition duration-500 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          Save role
        </button>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
        <h3 className="text-lg font-semibold">Reset password</h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">User will be forced to change password on next login. All sessions will be invalidated.</p>
        <input
          type="password"
          minLength={8}
          maxLength={256}
          value={resetPw}
          onChange={(e) => setResetPw(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition duration-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onReset}
          disabled={busy || resetPw.length < 8}
          className="self-start rounded-xl border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium transition duration-500 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          Reset password
        </button>
      </section>

      {!isSelf && (
        <section className="flex flex-col gap-2 rounded-xl border border-red-300 p-4 transition duration-500 dark:border-red-700">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">Danger zone</h3>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="self-start rounded-xl border border-red-300 bg-red-100 px-4 py-2 text-sm font-medium transition duration-500 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500 dark:bg-red-800 dark:hover:bg-red-700"
          >
            {deleting ? "Deleting..." : "Delete user"}
          </button>
        </section>
      )}

      {error && <p className="text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>}
      {success && <p className="text-sm text-green-700 transition duration-500 dark:text-green-300">{success}</p>}
    </div>
  );
}
