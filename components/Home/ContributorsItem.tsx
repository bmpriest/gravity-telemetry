import { type Credit } from "@/utils/credits";
import { formatDate } from "@/utils/functions";

export default function ContributorsItem({ contributor, index }: { contributor: Credit; index: number }) {
  // FlyonUI's accordion (HSAccordion) drives the open/close. Items that share an
  // `.accordion` parent (added in the lists that render this component) and aren't
  // marked `data-accordion-always-open` collapse their siblings when opened — which
  // reproduces the single-open behavior the old daisyUI radio group gave us. The
  // first item starts expanded via the `active` class (and the content omits
  // `hidden`); the +/- affordance is a plus icon rotated into an "×" while active.
  const contentId = `contributor-content-${index}`;
  const isOpen = index === 0;

  return (
    <div className={`accordion-item shrink-0 bg-neutral-100/50 dark:bg-neutral-900 ${isOpen ? "active" : ""}`}>
      <button
        type="button"
        className="accordion-toggle flex w-full items-center justify-between gap-2 p-4 text-left text-xl font-medium transition duration-500"
        aria-controls={contentId}
        aria-expanded={isOpen}
      >
        <span className="flex flex-col">
          {contributor.name}
          <time className="mt-px block text-left text-sm font-normal leading-none text-neutral-500 transition duration-500 dark:text-neutral-400">
            {formatDate(contributor.dateAdded)}
          </time>
        </span>
        <img
          className="size-5 shrink-0 select-none transition-transform duration-300 accordion-item-active:rotate-45 dark:invert"
          src="/ui/plusCircle.svg"
          aria-hidden="true"
        />
      </button>
      <div
        id={contentId}
        className={`accordion-content w-full overflow-hidden transition-[height] duration-300 ${isOpen ? "" : "hidden"}`}
        role="region"
      >
        <ul className="px-4 pb-4 text-base font-normal text-neutral-600 transition duration-500 dark:text-neutral-300">
          {contributor.specific.map((note, i) => (
            <li key={i} className="text-left transition duration-500">→ {note}{i === contributor.specific.length - 1 ? "" : ","}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
