import Link from "next/link";

type Showcase = {
  title: string;
  description: string;
  route: string;
  src: string;
  tag?: { name: string; color: string };
};

export default function CarouselCard({ showcase, className }: { showcase: Showcase; className?: string }) {
  return (
    <div className={`h-[calc(17rem-8vw)] w-[70vw] rounded-2xl bg-white/75 p-4 text-left shadow backdrop-blur transition hover:bg-white md:h-56 md:w-[25rem] lg:inset-y-4 lg:left-4 lg:h-64 lg:w-60 xl:h-72 ${className ?? ""}`}>
      <h4 className="text-left text-2xl font-bold text-black">{showcase.title}</h4>
      {showcase.tag && (
        <span className={`me-2 rounded px-2.5 py-0.5 text-left text-sm font-semibold text-black ${showcase.tag.color}`}>{showcase.tag.name}</span>
      )}
      <p className="mt-2 text-left text-black">{showcase.description}</p>
      <Link href={showcase.route} className="fo-btn absolute bottom-4 w-52 border-neutral-100 bg-neutral-100 hover:border-neutral-300 hover:bg-neutral-300">
        Go <img className="size-5 select-none" src="/ui/arrowRight.svg" aria-hidden="true" />
      </Link>
    </div>
  );
}
