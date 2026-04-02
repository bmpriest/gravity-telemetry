import { changelog, type Changelog } from "@/utils/changelog";
import { formatDate } from "@/utils/functions";

const typeIcon: Record<string, string> = {
  bugfix: "/ui/bugFix.svg",
  release: "/ui/majorRelease.svg",
  "minor release": "/ui/minorRelease.svg",
};

const typeBadge: Record<string, string> = {
  release: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  "minor release": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  bugfix: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

const typeLabel: Record<string, string> = {
  release: "Release",
  "minor release": "Feature",
  bugfix: "Bugfix",
};

export default function ChangelogItem({ change, className }: { change: Changelog; className?: string }) {
  const isLatest = change.version === changelog[changelog.length - 1].version;

  return (
    <li className={className}>
      <span className="absolute -start-3 flex size-7 items-center justify-center rounded-full bg-blue-100 transition duration-500 dark:bg-blue-900">
        <img className="size-5 select-none transition duration-500 dark:invert" src={typeIcon[change.type] ?? typeIcon["release"]} aria-hidden="true" />
      </span>
      <h3 className="mb-1 flex items-center text-lg font-semibold text-neutral-900 transition duration-500 dark:text-neutral-100">
        v{change.version}
        <span className={`me-2 ms-3 rounded px-2.5 py-0.5 text-sm font-medium transition duration-500 ${typeBadge[change.type]}`}>
          {typeLabel[change.type]}
        </span>
        {isLatest && (
          <span className="me-1 ms-1 rounded bg-yellow-100 px-2.5 py-0.5 text-sm font-medium text-yellow-800 transition duration-500 dark:bg-yellow-900 dark:text-yellow-300">
            Latest
          </span>
        )}
      </h3>
      <time className="mb-2 block text-left text-sm font-normal leading-none text-neutral-400">Released on {formatDate(change.release)}</time>
      <ul className="mb-4 text-base font-normal text-neutral-500 transition duration-500 dark:text-neutral-300">
        {change.notes.map((note, i) => (
          <li key={i} className="text-left transition duration-500">→ {note}{i === change.notes.length - 1 ? "" : ","}</li>
        ))}
      </ul>
    </li>
  );
}
