"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUserStore((s) => s.user);
  const fetchCurrentUser = useUserStore((s) => s.fetchCurrentUser);

  const force = searchParams.get("force") === "1";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated (after store has resolved user)
  useEffect(() => {
    if (user === null) router.replace("/login?redirect=/account");
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword || loading) return;
    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must differ from current password");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!body?.success) {
      setError(body?.error ?? "Failed to change password");
      return;
    }
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    await fetchCurrentUser();
    if (force) {
      setTimeout(() => router.replace("/home"), 800);
    }
  }

  if (!user) {
    return (
      <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full items-center justify-center p-8">
        <p className="transition duration-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-start p-8">
      <div className="flex w-full max-w-md flex-col items-stretch gap-6 rounded-2xl bg-neutral-100/50 p-8 shadow transition duration-500 dark:bg-neutral-900">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold transition duration-500">Account</h1>
          <p className="text-sm text-neutral-600 transition duration-500 dark:text-neutral-400">
            Signed in as <b>{user.username}</b>{user.isAdmin ? " (admin)" : ""}
          </p>
        </div>

        {force && user.mustChangePassword && (
          <div className="rounded-lg border border-yellow-500 bg-yellow-100 p-3 text-sm text-yellow-900 transition duration-500 dark:bg-yellow-900/40 dark:text-yellow-200">
            You must change your password before continuing.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold transition duration-500">Change password</h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="currentPassword" className="text-sm font-medium transition duration-500">Current password</label>
            {/* autoComplete="off" + unique name discourages browser/password-manager autofill,
                which would otherwise fill this with a saved (possibly stale) credential. */}
            <input
              id="currentPassword"
              name="cp_current"
              type="password"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="fo-input border-neutral-300 bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="newPassword" className="text-sm font-medium transition duration-500">New password</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              maxLength={256}
              required
              className="fo-input border-neutral-300 bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm" className="text-sm font-medium transition duration-500">Confirm new password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              maxLength={256}
              required
              className="fo-input border-neutral-300 bg-white text-black"
            />
            {confirm && newPassword !== confirm && (
              <p className="text-xs text-red-700 transition duration-500 dark:text-red-300">Passwords do not match</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-700 transition duration-500 dark:text-green-300">Password updated.</p>
          )}

          <button
            type="submit"
            disabled={!currentPassword || !newPassword || !confirm || newPassword !== confirm || loading}
            className="du-btn rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
