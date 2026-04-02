"use client";

import { useState } from "react";

interface Props {
  onSearch: (term: string) => void;
}

export default function BlueprintsSearch({ onSearch }: Props) {
  const [search, setSearch] = useState("");

  function handleChange(value: string) {
    setSearch(value);
    onSearch(value);
  }

  return (
    <div className="fo-input-group flex h-9 w-36 items-center justify-center rounded-full border-neutral-300 bg-white transition duration-500 lg:w-72 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600">
      <span className="fo-input-group-text">
        <img className="size-5 shrink-0 select-none transition duration-500 dark:invert" src="/ui/search.svg" aria-hidden="true" />
      </span>
      <input
        value={search}
        onChange={(e) => handleChange(e.target.value)}
        type="text"
        className="search-input fo-input grow select-none rounded-e-full text-left text-black transition duration-500 placeholder:transition placeholder:duration-500 dark:text-white dark:placeholder:text-neutral-300"
        placeholder="Search"
      />
      <div className={`du-tooltip fo-input-group-text p-0 ${search ? "visible" : "invisible"}`} data-tip="Clear">
        <button tabIndex={-1} className="fo-btn fo-btn-circle fo-btn-text rounded-full" type="button" onClick={() => handleChange("")}>
          <img className="size-5 select-none dark:invert" src="/ui/close.svg" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
