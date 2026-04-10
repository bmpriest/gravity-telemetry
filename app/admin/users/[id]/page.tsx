import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import EditUserForm from "@/components/admin/EditUserForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditUserPage({ params }: Props) {
  const { id } = await params;
  const [user, currentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        isAdmin: true,
        mustChangePassword: true,
        createdAt: true,
      },
    }),
    getCurrentUser(),
  ]);
  if (!user) notFound();
  const isSelf = currentUser?.id === user.id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">{user.username}</h2>
        <Link href="/admin/users" className="text-sm text-blue-700 underline transition duration-500 dark:text-blue-300">
          Back to users
        </Link>
      </div>
      <EditUserForm
        userId={user.id}
        username={user.username}
        isAdmin={user.isAdmin}
        mustChangePassword={user.mustChangePassword}
        isSelf={isSelf}
      />
    </div>
  );
}
