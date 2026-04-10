import Link from "next/link";
import NewUserForm from "@/components/admin/NewUserForm";

export default function NewUserPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">New user</h2>
        <Link href="/admin/users" className="text-sm text-blue-700 underline transition duration-500 dark:text-blue-300">
          Back to users
        </Link>
      </div>
      <NewUserForm />
    </div>
  );
}
