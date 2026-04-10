"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";

export default function LoginForm({ allowRegistration }: { allowRegistration: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useUserStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get("redirect") ?? "/home";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password || loading) return;
    setLoading(true);
    setError("");
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Login failed");
      return;
    }
    router.push(redirectTo);
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-stretch gap-6 rounded-2xl bg-neutral-100/50 p-8 shadow transition duration-500 dark:bg-neutral-900">
        <h1 className="text-center text-2xl font-bold transition duration-500">Sign in</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium transition duration-500">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={64}
              required
              className="fo-input border-neutral-300 bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium transition duration-500">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={256}
              required
              className="fo-input border-neutral-300 bg-white text-black"
            />
          </div>

          {error && (
            <p className="text-center text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={!username || !password || loading}
            className="du-btn rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {allowRegistration && (
          <p className="text-center text-sm transition duration-500">
            No account?{" "}
            <Link href="/register" className="text-blue-700 underline transition duration-500 dark:text-blue-300">
              Register
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
