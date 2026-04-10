"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Op } from "quill/core";
import type { SaveTemplate } from "@/utils/types";
import MailEditor from "@/components/Mail/MailEditor";
import MailTemplates from "@/components/Mail/MailTemplates";
import MailButtonClear from "@/components/Mail/Buttons/Clear";
import MailButtonCopy from "@/components/Mail/Buttons/Copy";
import MailButtonSave from "@/components/Mail/Buttons/Save";
import MailButtonShare from "@/components/Mail/Buttons/Share";

export default function MailEditPage() {
  const searchParams = useSearchParams();

  const [isClearText, setIsClearText] = useState(false);
  const [savedMail, setSavedMail] = useState<SaveTemplate>();
  const [outputText, setOutputText] = useState("");
  const [outputOps, setOutputOps] = useState<Op[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showMailTemplates, setShowMailTemplates] = useState(false);
  const [selectedMailTemplate, setSelectedMailTemplate] = useState<Op[]>();

  // clearText must auto-reset after one render cycle
  const clearTextTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function triggerClear() {
    setIsClearText(true);
    clearTimeout(clearTextTimer.current);
    clearTextTimer.current = setTimeout(() => setIsClearText(false), 0);
  }

  // template auto-reset after applied
  useEffect(() => {
    if (!selectedMailTemplate) return;
    setShowMailTemplates(false);
    const t = setTimeout(() => setSelectedMailTemplate(undefined), 100);
    return () => clearTimeout(t);
  }, [selectedMailTemplate]);

  async function getMail(id?: string) {
    const idQuery = id ?? searchParams.get("id");
    if (!idQuery) return;
    setLoading(true);
    const res = await fetch("/api/mail/get", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mailId: idQuery }),
    });
    const { success, error, content } = await res.json();
    setLoading(false);
    if (!success && error) { console.error(error); return; }
    if (success && content) {
      setSelectedMailTemplate(content.ops);
      setSavedMail(content);
    }
  }

  useEffect(() => { void getMail(); }, []);

  const dialogButtons: Record<string, (v: boolean) => void> = {
    clear: setShowClearDialog,
    save: setShowSaveDialog,
  };

  function deselectOthers(current: string) {
    for (const key of Object.keys(dialogButtons).filter((k) => k !== current)) {
      dialogButtons[key](false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4" role="tabpanel">
      <div className="flex items-center justify-center gap-2">
        <p className="transition duration-500">
          Need some inspiration? Try a{" "}
          <span className="cursor-pointer font-medium transition duration-500 hover:underline" onClick={() => setShowMailTemplates(true)}>mail template</span>
        </p>
        <div className="du-tooltip fo-input-group-text p-0" data-tip="View templates">
          <button type="button" className="fo-btn fo-btn-circle fo-btn-text" onClick={() => setShowMailTemplates(true)}>
            <img className="size-5 select-none transition duration-500 dark:invert" src="/ui/arrowRight.svg" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showMailTemplates && (
        <div className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)]" onClick={() => setShowMailTemplates(false)}>
          <MailTemplates onTemplate={(ops) => setSelectedMailTemplate(ops)} />
        </div>
      )}

      {loading ? (
        <div className="fo-skeleton fo-skeleton-animated h-96 w-full rounded-2xl shadow transition duration-500 md:w-[25rem] lg:w-[40rem] xl:w-[50rem]" />
      ) : (
        <MailEditor
          clearText={isClearText}
          template={selectedMailTemplate}
          onOutput={setOutputText}
          onOutputOps={setOutputOps}
        />
      )}

      <div className="flex items-center justify-center gap-5">
        <MailButtonClear showDialog={showClearDialog} onToggleDialog={(v) => { setShowClearDialog(v); deselectOthers("clear"); }} onClearText={triggerClear} />
        <MailButtonCopy showDialog={showCopyDialog} outputText={outputText} onToggleDialog={setShowCopyDialog} />
        <MailButtonSave showDialog={showSaveDialog} outputOps={outputOps} savedMail={savedMail} onToggleDialog={(v) => { setShowSaveDialog(v); deselectOthers("save"); }} onNewQuery={(id) => void getMail(id)} />
        <MailButtonShare showDialog={showShareDialog} savedMail={savedMail} onToggleDialog={setShowShareDialog} />
      </div>

      <div className="mt-4 hidden items-center justify-center gap-1 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-800 transition duration-500 [.touch_&]:flex dark:bg-neutral-800 dark:text-neutral-200" role="alert">
        <img className="mr-1 size-9 select-none transition duration-500 dark:invert" src="/ui/question.svg" aria-hidden="true" />
        <div className="flex flex-col items-start justify-center">
          <p className="transition duration-500"><span className="font-medium transition duration-500">Profanity filter:</span> The editor uses a basic profanity filter that does not reflect Infinite Lagrange&apos;s actual profanity filter.</p>
          <p className="transition duration-500">Gives a general idea if your mail will be blocked or not.</p>
        </div>
      </div>
    </div>
  );
}
