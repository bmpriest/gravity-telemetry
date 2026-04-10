import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/getCurrentUser";

// Admin pages read live DB state and depend on the session cookie — never prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");
  if (!user.isAdmin) notFound();

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-stretch p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-neutral-300 pb-4 transition duration-500 dark:border-neutral-700">
          <h1 className="text-3xl font-bold transition duration-500">Admin</h1>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link href="/admin" className="rounded-lg border border-neutral-300 px-3 py-1 transition duration-500 hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Dashboard
            </Link>
            <Link href="/admin/ships" className="rounded-lg border border-neutral-300 px-3 py-1 transition duration-500 hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Ships
            </Link>
            <Link href="/admin/attributes" className="rounded-lg border border-neutral-300 px-3 py-1 transition duration-500 hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Attributes
            </Link>
            <Link href="/admin/users" className="rounded-lg border border-neutral-300 px-3 py-1 transition duration-500 hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Users
            </Link>
          </nav>
        </header>
        <main className="flex flex-col gap-4">{children}</main>
      </div>
    </div>
  );
}
