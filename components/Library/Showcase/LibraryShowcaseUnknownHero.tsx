"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Tooltip from "@/components/ui/Tooltip";

export default function LibraryShowcaseUnknownHero() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleContact() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("c", "true");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <p className="transition duration-500">Have this module unlocked? Contact me!</p>

      <Tooltip content="Contact" className="mt-4">
        <button type="button" className="btn btn-circle btn-text" onClick={handleContact}>
          <img className="size-6 transition duration-500 dark:invert" src="/ui/contact.svg" alt="Contact me" />
        </button>
      </Tooltip>
    </div>
  );
}
