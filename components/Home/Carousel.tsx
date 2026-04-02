"use client";

import { useState, useEffect, useRef } from "react";
import CarouselCard from "./CarouselCard";

type Showcase = {
  title: string;
  description: string;
  route: string;
  src: string;
  tag?: { name: string; color: string };
};

const carouselShowcases: Showcase[] = [
  { title: "Blueprint Tracker", description: "Track your blueprint collection and share it with others", route: "/modules/blueprint-tracker", src: "/carousel/bpTracker.png", tag: { name: "New", color: "bg-purple-300" } },
  { title: "Module Library", description: "Browse through a collection of Super Capital modules and stats", route: "/modules/module-library", src: "/carousel/moduleLibrary.png", tag: { name: "Updated", color: "bg-green-300" } },
  { title: "Mail Editor", description: "Easily write, edit, save, and share mails for your community", route: "/modules/mail-editor/edit", src: "/carousel/mailEditor.png", tag: { name: "New", color: "bg-orange-200" } },
];

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  function start() {
    intervalRef.current = setInterval(() => setIndex((i) => (i + 1) % carouselShowcases.length), 7000);
  }

  function stop() {
    clearInterval(intervalRef.current);
  }

  function goTo(i: number) {
    stop();
    setIndex(i);
    start();
  }

  useEffect(() => {
    start();
    return stop;
  }, []);

  return (
    <>
      <div className="relative w-[80vw] overflow-hidden rounded-2xl bg-neutral-100 shadow md:w-[25rem] lg:w-[40rem] xl:w-[50rem]">
        <div className="flex w-full transition duration-500" style={{ transform: `translateX(-${index * 100}%)` }}>
          {carouselShowcases.map((showcase) => (
            <div key={showcase.title} className="relative h-full w-[80vw] shrink-0 md:w-[25rem] lg:w-[40rem] xl:w-[50rem]">
              <img className="w-full" src={showcase.src} aria-hidden="true" />
              <CarouselCard showcase={showcase} className="absolute hidden lg:block" />
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 left-1/2 flex w-full -translate-x-1/2 items-center justify-center gap-2">
          {carouselShowcases.map((_, i) => (
            <button
              key={i}
              className={`h-6 w-1/6 rounded-full shadow md:h-3 md:w-16 ${index === i ? "bg-white" : "bg-neutral-300"}`}
              type="button"
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
      <CarouselCard showcase={carouselShowcases[index]} className="relative mt-4 transition duration-500 lg:hidden dark:bg-neutral-900 dark:hover:bg-neutral-800" />
    </>
  );
}
