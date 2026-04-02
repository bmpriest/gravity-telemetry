"use client";

import { useState } from "react";
import type { Op } from "quill";
import MailTemplateItem from "./MailTemplateItem";
import { mailTemplates } from "@/utils/mailTemplates";

interface Props {
  onTemplate: (ops: Op[]) => void;
}

const templateNames = Object.keys(mailTemplates);
const templates = Object.values(mailTemplates);

export default function MailTemplates({ onTemplate }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div id="menu" className="flex w-[80vw] flex-col items-start justify-center gap-2 rounded-2xl bg-white p-4 md:w-[40rem] md:p-10 lg:w-[50rem] xl:w-[60rem] dark:bg-neutral-800" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-2xl font-bold">Templates</h2>
      <div className="h-[30rem] w-full overflow-y-scroll p-4">
        <ul className="relative flex flex-wrap items-center justify-center gap-1">
          {templateNames.map((name, index) => (
            <MailTemplateItem key={name} name={name} template={templates[index]} selected={index === selectedIndex} onClick={() => setSelectedIndex(index)} />
          ))}
        </ul>
      </div>
      <div className="flex w-full items-center justify-between">
        <p>Selected: <span className="text-lg font-medium">{templateNames[selectedIndex]}</span></p>
        <button
          type="button"
          className="du-btn flex items-center justify-center gap-2 rounded-xl border-green-300 bg-green-100 transition duration-500 hover:scale-105 hover:border-green-400 hover:bg-green-200 dark:border-green-500 dark:bg-green-800 dark:hover:bg-green-700"
          onClick={() => onTemplate(templates[selectedIndex])}
        >
          <span className="hidden transition duration-500 sm:inline-flex md:hidden lg:inline-flex">Use this template</span>
          <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/arrowRight.svg" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
