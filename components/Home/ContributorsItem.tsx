import { type Credit } from "@/utils/credits";
import { formatDate } from "@/utils/functions";

export default function ContributorsItem({ contributor, index }: { contributor: Credit; index: number }) {
  return (
    <div className="du-collapse du-collapse-plus shrink-0 bg-neutral-100/50 dark:bg-neutral-900" style={{ transition: "grid-template-rows 0.2s, background-color 0.5s" }}>
      <input className="h-full w-full" type="radio" name="contributors-list" defaultChecked={index === 0} />
      <div className="du-collapse-title text-left text-xl font-medium transition duration-500">
        {contributor.name}
        <time className="mt-px block text-left text-sm font-normal leading-none text-neutral-500 transition duration-500 dark:text-neutral-400">
          {formatDate(contributor.dateAdded)}
        </time>
      </div>
      <div className="du-collapse-content">
        <ul className="text-base font-normal text-neutral-600 transition duration-500 dark:text-neutral-300">
          {contributor.specific.map((note, i) => (
            <li key={i} className="text-left transition duration-500">→ {note}{i === contributor.specific.length - 1 ? "" : ","}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
