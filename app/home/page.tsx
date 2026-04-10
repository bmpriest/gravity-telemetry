"use client";

import type { Metadata } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Carousel from "@/components/Home/Carousel";
import ChangelogItem from "@/components/Home/ChangelogItem";
import ContributorsItem from "@/components/Home/ContributorsItem";
import Contact from "@/components/Home/Contact";
import { changelog } from "@/utils/changelog";
import { credits } from "@/utils/credits";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-start p-8">
      <div className="flex items-center justify-center gap-2" aria-label="Gravity Assist">
        <img className="size-16 select-none sm:size-20 md:size-24 lg:size-32 xl:size-40" src="/logo/logo.svg" aria-hidden="true" />
        <img className="h-16 select-none transition duration-500 sm:h-20 md:h-24 lg:h-32 xl:h-40 dark:invert" src="/logo/gravityAssist.svg" aria-hidden="true" />
      </div>

      <p className="text-xl transition duration-500">
        By <b>bmpriest/DubNubz</b>
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-2">
        <Carousel />
      </div>

      <div className="mt-16 flex w-[80vw] flex-col items-center justify-center gap-2 md:w-[25rem] lg:w-[40rem]">
        <h2 id="whats-new" className="text-3xl font-bold">
          <Link href="/home#whats-new" className="transition duration-500">What&apos;s New?</Link>
        </h2>
        <div className="fo-divider my-2 before:transition before:duration-500 after:transition after:duration-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          <span className="flex items-center justify-center"><img className="size-12 select-none transition duration-500 dark:invert" src="/ui/hourglass.svg" aria-hidden="true" /></span>
        </div>
        <div className="min-w-[20rem] rounded-2xl bg-neutral-100/50 p-4 transition duration-500 dark:bg-neutral-900">
          <div className="w-full p-4">
            <ol className="relative border-s border-neutral-200 transition duration-500 dark:border-neutral-700">
              <ChangelogItem className="ms-6" change={changelog[changelog.length - 1]} />
            </ol>
          </div>
        </div>
        <button type="button" className="flex w-full items-center justify-end gap-2" onClick={() => router.push(`?v=${changelog[changelog.length - 1].version}`)}>
          <p className="transition duration-500 hover:underline">View full changelog</p>
          <div className="du-tooltip" data-tip="View">
            <div className="fo-btn fo-btn-circle fo-btn-text">
              <img className="size-4 select-none transition duration-500 dark:invert" src="/ui/arrowRight.svg" aria-hidden="true" />
            </div>
          </div>
        </button>
      </div>

      <div className="mt-16 flex w-[80vw] flex-col items-center justify-center gap-2 md:w-[25rem] lg:w-[40rem]">
        <h2 id="top-contributors" className="text-3xl font-bold">
          <Link href="/home#top-contributors" className="transition duration-500">Top Contributors</Link>
        </h2>
        <div className="fo-divider my-2 before:transition before:duration-500 after:transition after:duration-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          <span className="flex items-center justify-center"><img className="size-12 select-none transition duration-500 dark:invert" src="/ui/trophy.svg" aria-hidden="true" /></span>
        </div>
        <div className="flex w-[80vw] flex-col gap-2 md:w-[25rem] lg:w-[35rem] xl:w-[40rem]">
          {credits.slice(0, 5).map((contributor, index) => (
            <ContributorsItem key={contributor.name} contributor={contributor} index={index} />
          ))}
          <button type="button" className="flex w-full items-center justify-end gap-2" onClick={() => router.push("?ct=true")}>
            <p className="transition duration-500 hover:underline">View all contributors</p>
            <div className="du-tooltip" data-tip="View">
              <div className="fo-btn fo-btn-circle fo-btn-text">
                <img className="size-4 select-none transition duration-500 dark:invert" src="/ui/arrowRight.svg" aria-hidden="true" />
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-16 flex w-[80vw] flex-col items-center justify-center gap-2 md:w-[25rem] lg:w-[40rem]">
        <h2 id="contact-me" className="text-3xl font-bold">
          <Link href="/home#contact-me" className="transition duration-500">Contact Me</Link>
        </h2>
        <div className="fo-divider my-2 before:transition before:duration-500 after:transition after:duration-500 dark:before:border-neutral-600 dark:after:border-neutral-600">
          <span className="flex items-center justify-center"><img className="size-12 select-none transition duration-500 dark:invert" src="/ui/contact.svg" aria-hidden="true" /></span>
        </div>
        <div className="flex w-[80vw] flex-col gap-2 md:w-[25rem] lg:w-[35rem] xl:w-[40rem]">
          <Contact isBlock />
        </div>
      </div>
    </div>
  );
}
