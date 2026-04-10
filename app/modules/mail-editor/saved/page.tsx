"use client";

import { useState, useEffect } from "react";
import type { SaveTemplate } from "@/utils/types";
import MailSavedItem from "@/components/Mail/MailSavedItem";
import { useUserStore } from "@/stores/userStore";

export default function MailSavedPage() {
  const user = useUserStore((s) => s.user);
  const savedMails = useUserStore((s) => s.savedMails);
  const setSavedMails = useUserStore((s) => s.setSavedMails);

  const [displayCount, setDisplayCount] = useState(5);
  const [deleteMail, setDeleteMail] = useState<SaveTemplate>();
  const [loading, setLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Infinite scroll
  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      if (scrollTop + windowHeight >= documentHeight * 0.9) setDisplayCount((c) => c + 5);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (savedMails && displayCount > savedMails.length) {
      window.removeEventListener("scroll", () => {});
    }
  }, [displayCount, savedMails]);

  async function removeMail() {
    if (!deleteMail || !user) return;
    setLoading(true);
    const res = await fetch("/api/mail/delete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mailId: deleteMail.id }),
    });
    const { success, error, content } = await res.json();
    setLoading(false);
    if (!success && error) { console.error(error); return; }
    if (success && content) {
      setDeleteSuccess(true);
      setSavedMails(content);
      setTimeout(() => setDeleteMail(undefined), 1000);
    }
  }

  const loadedMails = savedMails?.slice(0, displayCount);

  return (
    <div className="flex w-full flex-col items-center justify-center" role="tabpanel">
      <p className="transition duration-500">You have <span className="font-medium transition duration-500">{savedMails?.length ?? 0}/30</span> saved mails</p>
      <p className="transition duration-500">Mails unused for more than 6 months may be automatically deleted</p>

      {loadedMails ? (
        <div className="mt-4 flex w-full flex-col items-center justify-center gap-3 md:w-[25rem] lg:w-[40rem] xl:w-[50rem]">
          {loadedMails.length > 0 ? (
            loadedMails.map((mail) => (
              <MailSavedItem key={mail.id} mail={mail} onDelete={setDeleteMail} />
            ))
          ) : (
            <p className="text-2xl transition duration-500">You have no saved mail! Try drafting a mail and saving it.</p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex w-full flex-col items-center justify-center gap-3 md:w-[25rem] lg:w-[40rem] xl:w-[50rem]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="fo-skeleton fo-skeleton-animated h-56 w-full grow rounded-2xl bg-neutral-100 p-6 transition duration-500 dark:bg-neutral-900" />
          ))}
        </div>
      )}

      {deleteMail && (
        <div className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]" onClick={() => setDeleteMail(undefined)}>
          <div id="menu" className="flex w-[80vw] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 md:w-[40rem] md:p-10 dark:bg-neutral-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold">Are you sure you want to delete this mail?</h3>
            <p>This action is irreversible!</p>
            <MailSavedItem mail={deleteMail} readOnly />
            <div className="mt-3 flex w-full items-center justify-center gap-2">
              <button
                disabled={!user}
                className="fo-btn grow border-red-400 bg-red-400 hover:border-red-300 hover:bg-red-300 dark:hover:border-red-500 dark:hover:bg-red-500"
                type="button"
                onClick={removeMail}
              >
                {loading && <span className="du-loading du-loading-spinner du-loading-md transition duration-500 group-hover:text-white group-hover:duration-200 dark:group-hover:text-black" />}
                <span className="text-black transition duration-500 group-hover:text-white group-hover:duration-200 dark:text-white dark:group-hover:text-black">
                  {loading ? "Deleting..." : deleteSuccess ? "Deleted!" : "Yes"}
                </span>
              </button>
              <button className="fo-btn grow border-neutral-100 bg-neutral-100 hover:border-neutral-300 hover:bg-neutral-300" type="button" onClick={() => setDeleteMail(undefined)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
