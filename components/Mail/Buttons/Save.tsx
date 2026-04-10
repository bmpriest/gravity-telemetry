"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Op } from "quill/core";
import type { SaveTemplate } from "@/utils/types";
import { useUserStore } from "@/stores/userStore";
import { delay } from "@/utils/functions";

interface Props {
  showDialog: boolean;
  outputOps: Op[];
  savedMail: SaveTemplate | undefined;
  onToggleDialog: (val: boolean) => void;
  onNewQuery: (id: string) => void;
}

export default function MailButtonSave({ showDialog, outputOps, savedMail, onToggleDialog, onNewQuery }: Props) {
  const user = useUserStore((s) => s.user);
  const setSavedMails = useUserStore((s) => s.setSavedMails);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const placeholder = "Name your new mail!";

  async function getOwnership() {
    let tries = 0;
    while (tries < 10) {
      if (savedMail) setTemplateName(savedMail.name.slice(0, 100));
      tries++;
      await delay(50);
    }
  }

  useEffect(() => { void getOwnership(); }, [savedMail, user]);
  useEffect(() => { setError(""); }, [templateName]);
  useEffect(() => {
    if (!showDialog) { setTemplateName(""); setError(""); }
  }, [showDialog]);

  async function saveText() {
    if (!showDialog || !user || !templateName || error) return;
    setLoading(true);
    const res = await fetch("/api/mail/save", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: { name: templateName, ops: outputOps } }),
    });
    const { success: ok, error: err, content, outcomeMails } = await res.json();
    setLoading(false);
    if (!ok && err) { setError(err); return; }
    if (ok && content && outcomeMails) {
      setSuccess(true);
      setSavedMails(outcomeMails);
      setTimeout(() => { setSuccess(false); onToggleDialog(false); }, 1000);
      const params = new URLSearchParams(searchParams.toString());
      params.set("id", content.id);
      router.replace(`?${params.toString()}`);
      onNewQuery(content.id);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={`du-btn flex select-none items-center justify-center gap-2 rounded-xl border-blue-300 bg-blue-100 transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:hover:bg-blue-700 ${showDialog ? "scale-105 border-blue-400 bg-blue-200 dark:bg-blue-700" : "dark:bg-blue-800"}`}
        onClick={() => onToggleDialog(!showDialog)}
      >
        <span className="hidden transition duration-500 sm:inline-flex md:hidden lg:inline-flex">Save</span>
        <img className="size-5 transition duration-500 dark:invert" src="/ui/save.svg" aria-hidden="true" />
      </button>
      {showDialog && (
        <div className="fo-tooltip-content visible -right-24 bottom-12 opacity-100 sm:right-1/2 sm:translate-x-1/2" role="popover">
          {user ? (
            <div className="fo-tooltip-body flex w-64 flex-col items-center justify-center gap-3 rounded-lg border-2 border-blue-300 bg-blue-100 p-4 text-start shadow transition duration-500 dark:border-blue-500 dark:bg-blue-800">
              <div className="max-w-sm">
                <span className="fo-label justify-end">
                  <span className={`fo-label-text-alt transition duration-500 ${error ? "text-red-700 dark:text-red-200" : ""}`}>{templateName.length}/50</span>
                </span>
                <div className="relative">
                  <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} type="text" placeholder={placeholder} className={`fo-input border-neutral-300 bg-white text-black ${error ? "text-red-700" : ""}`} maxLength={100} />
                </div>
                <span className="fo-label">
                  <span className="fo-label-text-alt text-red-700 transition duration-500 dark:text-red-200">{error}</span>
                </span>
              </div>
              <div className="flex w-full items-center justify-between gap-2">
                <button
                  type="button"
                  className={`group du-btn du-btn-outline h-10 min-h-10 grow rounded-xl border-black py-0 text-base hover:border-neutral-900 hover:bg-neutral-900 dark:border-neutral-200 dark:hover:border-neutral-200 dark:hover:bg-neutral-200 ${!templateName ? "pointer-events-none cursor-default border-neutral-900 bg-neutral-900 opacity-25 dark:border-neutral-200 dark:bg-neutral-200" : ""}`}
                  onClick={saveText}
                >
                  {loading && <span className="du-loading du-loading-spinner du-loading-md transition duration-500 group-hover:text-white group-hover:duration-200 dark:group-hover:text-black" />}
                  <span className={`text-black transition duration-500 group-hover:text-white group-hover:duration-200 dark:text-white dark:group-hover:text-black ${!templateName ? "text-white dark:text-black" : ""}`}>
                    {loading ? "Saving..." : success ? "Saved!" : "Save"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="fo-tooltip-body flex w-64 flex-col items-center justify-center gap-3 rounded-lg border-2 border-blue-300 bg-blue-100 p-4 text-start shadow transition duration-500 dark:border-blue-500 dark:bg-blue-800">
              <p className="text-center text-lg font-medium text-black transition duration-500 dark:text-white">Something went wrong. Please try again later.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
