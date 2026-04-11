"use client";

import { useState, FormEvent } from "react";
import { useUserStore } from "@/stores/userStore";

/**
 * Blocking modal shown whenever the current user has `mustChangePassword=true`.
 *
 * Two scenarios:
 *  1. First login of the seeded admin (no old password to check, but we still
 *     ask for the seeded password to keep the flow consistent and prevent a
 *     drive-by attacker on an unattended browser from immediately rotating
 *     the credential).
 *  2. After an admin-initiated reset for any user — the user knows the
 *     temporary password the admin gave them, so the same UI applies.
 *
 * In both cases the backend re-verifies the old password before accepting
 * the new one.
 */
export default function MustChangePasswordGate() {
  const changePassword = useUserStore((s) => s.changePassword);
  const logout = useUserStore((s) => s.logout);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) { setError("Passwords don't match."); return; }
    if (newPassword === oldPassword) { setError("New password must differ from the current one."); return; }

    setLoading(true);
    const result = await changePassword(oldPassword, newPassword);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "Password change failed.");
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirm("");
  }

  return (
    <div
      className="fixed left-0 top-0 z-50 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.7)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="must-change-password-title"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <h1 id="must-change-password-title" className="text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Your account requires a password change before you can continue.
        </p>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="fo-input rounded-lg border-neutral-300 bg-white px-3 py-2 text-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={200}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="fo-input rounded-lg border-neutral-300 bg-white px-3 py-2 text-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">At least 8 characters</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={200}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="fo-input rounded-lg border-neutral-300 bg-white px-3 py-2 text-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
            />
          </label>

          {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="fo-btn w-full rounded-lg border-blue-300 bg-blue-100 py-2 font-medium hover:border-blue-400 hover:bg-blue-200 disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="fo-btn w-full rounded-lg border-neutral-300 bg-neutral-100 py-2 text-sm font-medium hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
              Log out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
