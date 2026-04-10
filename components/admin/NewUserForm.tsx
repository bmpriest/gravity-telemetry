"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewUserForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, isAdmin }),
    });
    const body = await res.json().catch(() => null);
    setSubmitting(false);
    if (!body?.success) {
      setError(body?.error ?? "Create failed");
      return;
    }
    setSuccess(`Created user "${username}". Redirecting…`);
    setTimeout(() => router.push("/admin/users"), 800);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <Field label="Username" id="username">
        <input id="username" required maxLength={64} value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} autoComplete="off" />
      </Field>
      <Field label="Initial password" id="password" hint="User will be required to change on first login.">
        <input id="password" type="password" required minLength={8} maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="new-password" />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="size-5" />
        <span>Admin</span>
      </label>
      {error && <p className="text-sm text-red-700 transition duration-500 dark:text-red-300">{error}</p>}
      {success && <p className="rounded-lg border border-green-500 bg-green-100 p-2 text-sm text-green-900 transition duration-500 dark:bg-green-900/40 dark:text-green-200">{success}</p>}
      <button
        type="submit"
        disabled={submitting || !!success}
        className="du-btn rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
      >
        {submitting ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}

const inputCls =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition duration-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white";

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium transition duration-500">{label}</label>
      {children}
      {hint && <span className="text-xs text-neutral-600 transition duration-500 dark:text-neutral-400">{hint}</span>}
    </div>
  );
}
