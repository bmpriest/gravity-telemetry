"use client";

import { useState } from "react";
import { changelog } from "@/utils/changelog";
import ChangelogItem from "./ChangelogItem";

const reversed = [...changelog].reverse();

export default function Changelog() {
  const [loadedCount, setLoadedCount] = useState(5);
  const endOfChangelog = loadedCount >= reversed.length;

  function loadMore() {
    setLoadedCount((c) => Math.min(c + 5, reversed.length));
  }

  return (
    <div id="menu" className="flex w-[80vw] flex-col items-start justify-center gap-2 rounded-2xl bg-white p-4 md:w-[40rem] md:p-10 dark:bg-neutral-800" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-2xl font-bold">Changelog</h2>
      <div className="h-96 w-full overflow-y-scroll p-4">
        <ol className="relative border-s border-neutral-200 dark:border-neutral-700">
          {reversed.slice(0, loadedCount).map((change) => (
            <ChangelogItem key={change.version} className="mb-10 ms-6" change={change} />
          ))}
        </ol>
        {!endOfChangelog && (
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 hover:text-blue-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
            onClick={loadMore}
          >
            <img className="size-5 select-none dark:invert" src="/ui/load.svg" aria-hidden="true" />
            Load more
          </button>
        )}
      </div>
      <p>Current version: <span className="text-lg font-medium">v{changelog[changelog.length - 1].version}</span></p>
    </div>
  );
}
