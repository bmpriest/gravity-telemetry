"use client";

import { useRouter, useSearchParams } from "next/navigation";

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

      <div className="du-tooltip mt-4" data-tip="Contact">
        <button type="button" className="fo-btn fo-btn-circle fo-btn-text" onClick={handleContact}>
          <img className="size-6 transition duration-500 dark:invert" src="/ui/contact.svg" alt="Contact me" />
        </button>
      </div>
    </div>
  );
}
