"use client";

import { useState } from "react";
import AdminUsers from "@/components/Admin/AdminUsers";
import AdminManufacturers from "@/components/Admin/AdminManufacturers";
import AdminFragments from "@/components/Admin/AdminFragments";
import AdminDatabase from "@/components/Admin/AdminDatabase";
import AdminSql from "@/components/Admin/AdminSql";
import AdminImport from "@/components/Admin/AdminImport";

interface Props {
  currentUserId: string;
}

type Tab = "database" | "sql" | "import" | "manufacturers" | "fragments" | "users";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`btn rounded-full border px-5 py-2 text-sm font-medium transition duration-500 ${
        active
          ? "border-blue-400 bg-blue-100 dark:border-blue-500 dark:bg-blue-800"
          : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdminClient({ currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("database");

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center p-4 sm:p-8">
      <div className="flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold transition duration-500">Admin</h1>
          <p className="text-sm text-neutral-500 transition duration-500 dark:text-neutral-400">
            Edit the catalogue table-by-table, run read-only SQL, import ships.json, and manage manufacturers, fragments and users.
          </p>
        </div>

        <div role="tablist" className="flex flex-wrap justify-center gap-2">
          <TabButton active={tab === "database"} onClick={() => setTab("database")}>Database</TabButton>
          <TabButton active={tab === "sql"} onClick={() => setTab("sql")}>SQL</TabButton>
          <TabButton active={tab === "import"} onClick={() => setTab("import")}>Import</TabButton>
          <TabButton active={tab === "manufacturers"} onClick={() => setTab("manufacturers")}>Manufacturers</TabButton>
          <TabButton active={tab === "fragments"} onClick={() => setTab("fragments")}>Fragments</TabButton>
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>Users</TabButton>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition duration-500 sm:p-6 dark:border-neutral-700 dark:bg-neutral-900">
          {tab === "database" && <AdminDatabase />}
          {tab === "sql" && <AdminSql />}
          {tab === "import" && <AdminImport />}
          {tab === "manufacturers" && <AdminManufacturers />}
          {tab === "fragments" && <AdminFragments />}
          {tab === "users" && <AdminUsers currentUserId={currentUserId} />}
        </div>
      </div>
    </div>
  );
}
