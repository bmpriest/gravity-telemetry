"use client";

import { useState } from "react";
import { useUserStore } from "@/stores/userStore";

export default function HomeLink() {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [userId, setUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkFailure, setLinkFailure] = useState(false);
  const [sillyBilly, setSillyBilly] = useState(false);

  function copyText(text: string | undefined) {
    if (!text) return;
    void navigator.clipboard.writeText(text);
  }

  async function link(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !accessToken) return;

    if (userId === user?.uid && accessToken === user?.accessToken) {
      setSillyBilly(true);
      setTimeout(() => setSillyBilly(false), 1500);
      return;
    }

    setLinkLoading(true);
    const res = await fetch("/api/users/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: userId, accessToken, updateOrigin: true }),
    });
    const { success, error } = await res.json();
    setLinkLoading(false);

    if (!success && error) {
      setLinkFailure(true);
      setTimeout(() => setLinkFailure(false), 1500);
      console.error(error);
      return;
    }

    localStorage.setItem("token", accessToken);
    localStorage.setItem("uid", userId);
    setLinkSuccess(true);
    setTimeout(() => {
      setLinkSuccess(false);
      window.location.reload();
    }, 1500);
  }

  const disabled = !userId || !accessToken;

  return (
    <>
      <p className="text-sm transition duration-500">Gravity Assist data (blueprints, mails, etc.) isn&apos;t shared between different devices or browsers.</p>
      <h5 className="font-medium transition duration-500">To link your data, paste the below information from the device/browser you want to link.</h5>

      <form className="flex w-full flex-col items-center justify-center gap-2" onSubmit={link}>
        <div className="mt-4 flex w-full flex-col items-start justify-center gap-1 md:flex-row md:items-center md:gap-4">
          <p className="w-40 text-nowrap text-left transition duration-500">User ID</p>
          <div className="fo-input-group flex grow rounded-full bg-body transition duration-500 dark:border-neutral-400 dark:bg-neutral-800 dark:hover:border-neutral-400">
            <span className="fo-input-group-text shrink-0"><img className="size-5 select-none transition duration-500 dark:invert" src="/ui/person.svg" aria-hidden="true" /></span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} type="text" placeholder="Enter the User ID from the other device/browser" className="fo-input grow rounded-e-full text-left text-black transition duration-500 placeholder:transition placeholder:duration-500 dark:text-white dark:placeholder:text-neutral-400" />
          </div>
        </div>
        <div className="flex w-full flex-col items-start justify-center gap-1 md:flex-row md:items-center md:gap-4">
          <p className="w-40 text-nowrap text-left transition duration-500">Unique Token</p>
          <div className="fo-input-group flex grow rounded-full bg-body transition duration-500 dark:border-neutral-400 dark:bg-neutral-800 dark:hover:border-neutral-400">
            <span className="fo-input-group-text shrink-0"><img className="size-5 select-none transition duration-500 dark:invert" src="/ui/key.svg" aria-hidden="true" /></span>
            <input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} type="text" placeholder="Enter the Unique Token from the other device/browser" className="fo-input grow rounded-e-full text-left text-black transition duration-500 placeholder:transition placeholder:duration-500 dark:text-white dark:placeholder:text-neutral-400" />
          </div>
        </div>
        <button
          type="submit"
          disabled={disabled}
          className={`flex h-9 w-9 select-none items-center justify-center rounded-full border border-neutral-300 p-0 transition duration-500 lg:w-36 lg:justify-start lg:p-2 lg:px-4 dark:border-neutral-700 ${disabled ? "bg-neutral-400 dark:bg-neutral-950" : "bg-white hover:border-neutral-400 dark:bg-neutral-700 dark:hover:border-neutral-700"}`}
        >
          {linkLoading ? <span className="fo-loading fo-loading-spinner fo-loading-sm" /> : <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/link.svg" aria-hidden="true" />}
          <span className="hidden grow transition duration-500 lg:block">
            {sillyBilly ? "That's you!" : linkFailure ? "Failed" : linkSuccess ? "Linked!" : linkLoading ? "Linking" : "Link"}
          </span>
        </button>
      </form>

      {[
        { label: "Your User ID", icon: "/ui/person.svg", value: user?.uid },
        { label: "Your Unique Token", icon: "/ui/key.svg", value: user?.accessToken },
      ].map(({ label, icon, value }) => (
        <div key={label} className="flex w-full flex-col items-start justify-center gap-1 md:flex-row md:items-center md:gap-4">
          <p className="w-44 text-nowrap text-left transition duration-500">{label}</p>
          <div className="fo-input-group flex grow rounded-full bg-body transition duration-500 dark:border-neutral-400 dark:bg-neutral-800 dark:hover:border-neutral-400">
            <span className="fo-input-group-text shrink-0"><img className="size-5 select-none transition duration-500 dark:invert" src={icon} aria-hidden="true" /></span>
            <div className="fo-input grow rounded-e-full">
              <p className="w-32 overflow-hidden overflow-ellipsis text-nowrap text-left transition duration-500 lg:w-52">{value}</p>
            </div>
            <div className="du-tooltip fo-input-group-text p-0" data-tip={value ? "Copy" : "Unavailable"}>
              <button className="fo-btn fo-btn-circle fo-btn-text" type="button" disabled={!value} onClick={() => copyText(value)}>
                <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/copy.svg" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
