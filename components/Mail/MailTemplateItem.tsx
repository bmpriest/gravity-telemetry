import type { Op } from "quill";
import MailQuill from "./MailQuill";

interface Props {
  name: string;
  template: Op[];
  selected: boolean;
  onClick: () => void;
}

export default function MailTemplateItem({ name, template, selected, onClick }: Props) {
  return (
    <button
      className={`flex w-full cursor-pointer select-none flex-col items-center justify-center rounded-xl p-6 transition hover:bg-neutral-100 xl:w-2/5 xl:grow dark:hover:bg-neutral-900 ${selected ? "bg-neutral-100 dark:bg-neutral-900" : ""}`}
      type="button"
      onClick={onClick}
    >
      <h3 className="text-2xl font-medium">{name}</h3>
      <p>{selected ? "Selected" : "Click to select"}</p>
      <div className="editor-bg mt-2 h-96 w-full rounded-2xl">
        <MailQuill underline={false} color="#ffffff" readOnly startText={template} />
      </div>
    </button>
  );
}
