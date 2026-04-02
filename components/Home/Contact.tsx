"use client";

export default function Contact({ isBlock }: { isBlock?: boolean }) {
  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
  }

  return (
    <div
      id="menu"
      className={`flex w-[80vw] flex-col items-start justify-center gap-2 rounded-2xl md:w-[40rem] ${!isBlock ? "bg-white p-4 md:p-10 dark:bg-neutral-800" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {!isBlock && <h2 className="text-2xl font-bold transition duration-500">Contact</h2>}
      <p className="transition duration-500">The best way to reach me is through Discord!</p>
      <div className={`mt-4 flex flex-col items-center justify-center gap-2 ${isBlock ? "w-full md:w-[25rem] lg:w-[35rem] xl:w-full" : "w-full"}`}>
        {[
          { label: "Infinite Lagrange", icon: "/ui/search.svg", value: "New Halcyon", isLink: false },
          { label: "Discord", icon: "/logo/discord.svg", value: "kolfae", isLink: false },
        ].map(({ label, icon, value }) => (
          <div key={label} className="flex w-full flex-col items-start justify-center gap-1 md:flex-row md:items-center md:gap-4">
            <p className="w-40 text-nowrap text-left transition duration-500">{label}</p>
            <div className="fo-input-group flex grow rounded-full bg-body transition duration-500 dark:border-neutral-400 dark:bg-neutral-600 dark:hover:border-neutral-400">
              <span className="fo-input-group-text"><img className="size-5 select-none transition duration-500 dark:invert" src={icon} aria-hidden="true" /></span>
              <div className="fo-input grow rounded-e-full">
                <p className="w-44 overflow-hidden overflow-ellipsis text-nowrap text-left transition duration-500 sm:w-full">{value}</p>
              </div>
              <div className="du-tooltip fo-input-group-text p-0" data-tip="Copy">
                <button className="fo-btn fo-btn-circle fo-btn-text" type="button" onClick={() => copyText(value)}>
                  <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/copy.svg" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {/* <div className="flex w-full flex-col items-start justify-center gap-1 md:flex-row md:items-center md:gap-4">
          <p className="w-40 text-nowrap text-left transition duration-500">Server</p>
          <div className="fo-input-group flex grow rounded-full bg-body transition duration-500 dark:border-neutral-400 dark:bg-neutral-600 dark:hover:border-neutral-400">
            <span className="fo-input-group-text"><img className="size-5 select-none transition duration-500 dark:invert" src="/logo/discord.svg" aria-hidden="true" /></span>
            <div className="fo-input grow rounded-e-full">
              <a className="block w-44 overflow-hidden overflow-ellipsis text-nowrap text-left no-underline transition duration-500 hover:underline sm:w-full" href="https://discord.com/invite/9mJ9b2Bbzx" target="_blank" rel="noopener noreferrer">
                https://discord.gg/9mJ9b2Bbzx
              </a>
            </div>
            <div className="du-tooltip fo-input-group-text p-0" data-tip="Join">
              <a className="fo-btn fo-btn-circle fo-btn-text no-underline" href="https://discord.com/invite/9mJ9b2Bbzx" target="_blank" rel="noopener noreferrer">
                <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/arrowRight.svg" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
