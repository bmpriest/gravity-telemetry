"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/userStore";

export default function RegisterForm() {
  const router = useRouter();
  const register = useUserStore((s) => s.register);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password || loading) return;
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    const res = await register(username, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Registration failed");
      return;
    }
    router.push("/home");
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-stretch gap-6 rounded-2xl bg-neutral-100/50 p-8 shadow transition duration-500 dark:bg-neutral-900">
        <h1 className="text-center text-2xl font-bold transition duration-500">Create account</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium transition duration-500">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={64}
              required
              className="fo-input border-neutral-300 bg-white text-black"
            />
            <p className="text-xs text-neutral-600 transition duration-500 dark:text-neutral-400">
              3-64 chars: letters, digits, _ . -
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium transition duration-500">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={256}
              required
              className="fo-input border-neutral-300 bg-white text-black"
            />
            <p className="text-xs text-neutral-600 transition duration-500 dark:text-neutral-400">
              8 characters minimum
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm" className="text-sm font-medium transition duration-500">Confirm password</label>
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
            {confirm && password !== confirm && (
              <p className="text-xs text-red-700 transition duration-500 dark:text-red-300">Passwords do not match</p>
            )}
          </div>

          {error && (
            <p className="text-center text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={!username || !password || !confirm || password !== confirm || loading}
            className="du-btn rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm transition duration-500">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-700 underline transition duration-500 dark:text-blue-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
