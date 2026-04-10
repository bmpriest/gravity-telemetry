import Link from "next/link";
import ShipForm from "@/components/admin/ShipForm";

export default function NewShipPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">New ship</h2>
        <Link href="/admin/ships" className="text-sm text-blue-700 underline transition duration-500 dark:text-blue-300">
          Back to ships
        </Link>
      </div>
      <ShipForm />
    </div>
  );
}
