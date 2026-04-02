"use client";

import { useRouter } from "next/navigation";
import { credits } from "@/utils/credits";
import ContributorsItem from "./ContributorsItem";

export default function Contributors() {
  const router = useRouter();

  return (
    <div id="menu" className="flex w-[80vw] flex-col items-start justify-center gap-2 rounded-2xl bg-white p-4 md:w-[40rem] md:p-10 dark:bg-neutral-800" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-2xl font-bold">Contributors</h2>
      <p>Thank you to everyone who has contributed to Gravity Assist!</p>
      <div className="flex h-96 w-full flex-col gap-2 overflow-y-scroll p-4">
        {credits.map((contributor, index) => (
          <ContributorsItem key={contributor.name} contributor={contributor} index={index} />
        ))}
      </div>
      <p>Got something to share?{" "}
        <button className="font-medium hover:underline" type="button" onClick={() => router.push("?c=true")}>
          Reach out!
        </button>
      </p>
    </div>
  );
}
