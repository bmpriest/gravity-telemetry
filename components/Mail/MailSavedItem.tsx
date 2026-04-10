"use client";

import Link from "next/link";
import type { Op } from "quill/core";
import MailQuill from "./MailQuill";
import { useUserStore } from "@/stores/userStore";
import { formatDate } from "@/utils/functions";
import type { SaveTemplate } from "@/utils/types";

interface Props {
  mail: SaveTemplate;
  readOnly?: boolean;
  onDelete?: (mail: SaveTemplate) => void;
}

export default function MailSavedItem({ mail, readOnly, onDelete }: Props) {
  const user = useUserStore((s) => s.user);
  const baseUrl = "/modules/mail-editor/edit";
  const link = user ? `${baseUrl}?id=${mail.id}` : baseUrl;

  return (
    <div className={`flex w-full grow flex-col items-center justify-center gap-3 rounded-2xl transition ${readOnly ? "p-4" : "p-6 hover:bg-neutral-100 lg:flex-row lg:gap-0 dark:hover:bg-neutral-900"}`}>
      <div className="flex w-64 shrink-0 flex-col items-center justify-center">
        <h3 className="mb-1 w-60 overflow-hidden overflow-ellipsis text-nowrap text-center text-xl font-medium transition duration-500">{mail.name}</h3>
        <p className="transition duration-500">Created {formatDate(mail.createdAt, "numeric", true)}</p>
        <p className="transition duration-500">Last modified {formatDate(mail.lastSaved, "numeric", true)}</p>
        {!readOnly && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {link === baseUrl ? (
              <div className="fo-btn grow-[3] border-neutral-100 bg-neutral-100">Edit <img className="size-5" src="/ui/pencil.svg" aria-hidden="true" /></div>
            ) : (
              <Link href={link} className="fo-btn grow-[3] select-none border-neutral-100 bg-neutral-100 hover:border-neutral-300 hover:bg-neutral-300">
                Edit <img className="size-5" src="/ui/pencil.svg" aria-hidden="true" />
              </Link>
            )}
            <button disabled={!user} className="fo-btn select-none border-red-400 bg-red-400 px-3 hover:border-red-300 hover:bg-red-300 dark:hover:border-red-500 dark:hover:bg-red-500" type="button" onClick={() => onDelete?.(mail)}>
              <img className="size-5" src="/ui/trash.svg" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <div className="editor-bg h-44 w-full select-none rounded-2xl border border-transparent transition duration-500 dark:border-neutral-700">
        <MailQuill underline={false} color="#ffffff" readOnly startText={mail.ops as Op[]} />
      </div>
    </div>
  );
}
