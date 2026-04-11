"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { useFleetStore } from "@/stores/fleetStore";
import { useBlueprintStore } from "@/stores/blueprintStore";
import { useMailStore } from "@/stores/mailStore";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useUserStore((s) => s.register);
  const syncFleets = useFleetStore((s) => s.syncWithServer);
  const syncBlueprints = useBlueprintStore((s) => s.syncWithServer);
  const fetchMails = useMailStore((s) => s.fetchFromServer);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const result = await register(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Registration failed.");
      return;
    }
    void syncFleets();
    void syncBlueprints();
    void fetchMails();
    const returnTo = searchParams.get("returnTo");
    router.replace(returnTo && returnTo.startsWith("/") ? returnTo : "/home");
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-start p-8">
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition duration-500 dark:border-neutral-700 dark:bg-neutral-900">
        <h1 className="text-3xl font-bold transition duration-500">Create Account</h1>

        <form className="flex w-full flex-col items-center gap-4" onSubmit={onSubmit}>
          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium transition duration-500">Username</span>
            <input
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9._\-]{3,32}"
              title="3-32 characters: letters, digits, '.', '_', '-'"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="fo-input rounded-lg border-neutral-300 bg-white px-3 py-2 text-black transition duration-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">3-32 characters: letters, digits, &apos;.&apos;, &apos;_&apos;, or &apos;-&apos;</span>
          </label>

          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium transition duration-500">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={200}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="fo-input rounded-lg border-neutral-300 bg-white px-3 py-2 text-black transition duration-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">At least 8 characters</span>
          </label>

          <label className="flex w-full flex-col gap-1">
            <span className="text-sm font-medium transition duration-500">Confirm Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={200}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="fo-input rounded-lg border-neutral-300 bg-white px-3 py-2 text-black transition duration-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
            />
          </label>

          {error && <p className="w-full text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="fo-btn w-full rounded-lg border-blue-300 bg-blue-100 py-2 font-medium transition duration-500 hover:border-blue-400 hover:bg-blue-200 disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-sm transition duration-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline transition duration-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
