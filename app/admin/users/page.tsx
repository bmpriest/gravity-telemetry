import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      isAdmin: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">Users ({users.length})</h2>
        <Link
          href="/admin/users/new"
          className="rounded-xl border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          New user
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-300 bg-neutral-100/50 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-300 transition duration-500 dark:border-neutral-700">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Must change password</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-neutral-200 transition duration-500 last:border-b-0 hover:bg-neutral-200/40 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-blue-700 underline transition duration-500 dark:text-blue-300">
                    {u.username}
                  </Link>
                </td>
                <td className="px-3 py-2">{u.isAdmin ? "yes" : ""}</td>
                <td className="px-3 py-2">{u.mustChangePassword ? "yes" : ""}</td>
                <td className="px-3 py-2 tabular-nums text-xs text-neutral-600 dark:text-neutral-400">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
