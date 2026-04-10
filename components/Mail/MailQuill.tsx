"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import type { Delta, Op } from "quill/core";
import { formattingColors } from "@/utils/mailTemplates";
import { delay } from "@/utils/functions";

export interface MailQuillHandle {
  clearText: () => void;
  setColor: (color: string) => void;
  setUnderline: (val: boolean) => void;
  setContents: (ops: Op[]) => void;
}

interface Props {
  underline: boolean;
  color: string;
  readOnly?: boolean;
  startText?: Op[];
  onEvent?: (underline: boolean, color: string | string[]) => void;
  onOutput?: (output: Delta | Op[]) => void;
}

const MailQuill = forwardRef<MailQuillHandle, Props>(function MailQuill(
  { underline, color, readOnly, startText, onEvent, onOutput },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<InstanceType<typeof import("quill")["default"]> | null>(null);
  // Track latest prop values in refs so event handlers don't stale-close
  const colorRef = useRef(color);
  const underlineRef = useRef(underline);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { underlineRef.current = underline; }, [underline]);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    clearText() {
      const q = quillRef.current;
      if (!q) return;
      q.deleteText(0, q.getLength());
      localStorage.removeItem("autosave");
      onOutput?.(q.getContents());
    },
    setColor(c: string) {
      const q = quillRef.current;
      if (!q) return;
      q.format("color", c);
      onOutput?.(q.getContents());
    },
    setUnderline(val: boolean) {
      const q = quillRef.current;
      if (!q) return;
      q.format("underline", val ? "underline" : "");
      onOutput?.(q.getContents());
    },
    setContents(ops: Op[]) {
      void setTemplate(ops);
    },
  }));

  async function setTemplate(text: Op[] | undefined) {
    const q = quillRef.current;
    if (!q || !text) { await delay(1); return setTemplate(text); }
    q.setContents(text as Parameters<typeof q.setContents>[0]);
    const length = q.getLength();
    q.setSelection({ index: length, length: 0 });
    onOutput?.(text);
    const selection = q.getSelection();
    if (!selection) return;
    const fmt = q.getFormat();
    void formatSelection(selection, fmt);
    onEvent?.(Boolean(fmt.underline), (fmt.color as string) ?? "#ffffff");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function formatSelection(selectionRange: any, selection: Record<string, unknown>) {
    const q = quillRef.current;
    if (!q) return;
    if (selection.color !== "#278451" || q.getText(selectionRange.index - 1, 1) !== ")") return;
    const newFmt = q.getFormat(selectionRange.index + 1);
    const c = colorRef.current !== "#278451" ? colorRef.current : "#ffffff";
    q.format("color", c);
    q.format("underline", false);
    onEvent?.(false, c);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function defaultFormat(delta: any, text: any): [any, number] {
    const q = quillRef.current;
    if (!q) return [text, 0];
    let selectionOffset = 0;

    for (let i = 0; i < text.ops.length; i++) {
      const op = text.ops[i];
      const insert = op.insert as string | undefined;

      if (insert?.slice(0, 2) !== "\n" && !op.attributes?.color)
        op.attributes = { ...op.attributes, color: colorRef.current };

      const coordinateRegex = /([^\(]*)(\(\d{1,4},\d{1,4}\))(.*)/;
      let coordinateMatch = insert?.match(coordinateRegex);
      if (coordinateMatch && !op.attributes?.underline && op.attributes?.color !== "#278451") {
        const [, before, coordinates, after] = coordinateMatch;
        if (before) text.ops.splice(i, 0, { insert: before, attributes: { ...op.attributes } });
        if (after) text.ops.splice(i + 2, 0, { insert: after, attributes: { ...op.attributes, color: "#ffffff" } });
        op.insert = coordinates;
        op.attributes = { underline: true, color: "#278451" };
        coordinateMatch = insert?.match(coordinateRegex);
      }

      const formattingRegex = /(#[rEeRODYGBUPWK]|#c[0-9a-fA-F]{6})/;
      if (insert && formattingRegex.test(insert)) {
        const [before, code, after] = insert.split(formattingRegex);
        selectionOffset += delta.ops[delta.ops.length - 1].insert === "#" ? 1 : code.length;
        if (before) text.ops.splice(i, 0, { insert: before, attributes: { ...op.attributes } });
        if (after) text.ops.splice(i + 2, 0, { insert: after, attributes: { ...op.attributes } });

        if (code === "#r") {
          op.insert = "\n";
          selectionOffset = -1;
        } else {
          const colorToInsert = !["r", "e", "E"].includes(code[1])
            ? code.length === 2 ? formattingColors[code[1] as keyof typeof formattingColors] : `#${code.slice(2)}`
            : (op.attributes?.color ?? colorRef.current);
          const ul = op.attributes?.underline ? code !== "#e" : code === "#E";
          onEvent?.(ul, colorToInsert as string);
          text.ops.splice(i + (before ? 1 : 0), 1);
        }
      }
    }
    return [text, selectionOffset];
  }

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    async function initQuill() {
      const { default: Quill } = await import("quill");

      if (!mounted || !containerRef.current) return;

      const q = new Quill(containerRef.current, {
        placeholder: "Start composing your mail here...",
        formats: ["underline", "color"],
        readOnly: readOnly ?? false,
      });
      quillRef.current = q;

      const editorEl = containerRef.current.querySelector(".ql-editor");
      editorEl?.setAttribute("spellcheck", "false");
      editorEl?.setAttribute("enterkeyhint", "enter");
      editorEl?.setAttribute("autocorrect", "off");

      if (startText) {
        q.setContents(startText as Parameters<typeof q.setContents>[0]);
      } else {
        try {
          const autosave = localStorage.getItem("autosave");
          if (autosave) {
            const delta = JSON.parse(autosave) as Delta;
            q.setContents(delta);
            q.setSelection(q.getLength());
            const fmt = q.getFormat();
            onEvent?.(Boolean(fmt.underline), (fmt.color as string) ?? "#ffffff");
            onOutput?.(delta);
          }
        } catch (err) {
          console.warn("Failed to load autosave.", err);
        }
      }

      q.on("selection-change", (_range, _old, source) => {
        if (source !== "user") return;
        const sel = q.getSelection();
        if (!sel) return;
        const text = q.getText(sel.index - 1, 1);
        const fmt = q.getFormat();
        const ul = text === ")" ? false : Boolean(fmt.underline);
        const c = (fmt.color as string) === "#278451" ? "#ffffff" : ((fmt.color as string) ?? "#ffffff");
        onEvent?.(ul, c);
      });

      q.on("text-change", (delta, oldDelta, source) => {
        if (source !== "user") return;
        let sel = q.getSelection();
        if (!sel) return;

        const [content, selectionOffset] = defaultFormat(delta, q.getContents());
        q.setContents(content);
        sel.index -= selectionOffset;

        const length = q.getLength();
        const hasNewline = delta.ops.find((op) => op.insert === "\n") ||
          (oldDelta.ops[oldDelta.ops.length - 1].insert as string)?.includes("\n\n") ||
          (oldDelta.ops.length === 1 && oldDelta.ops[0].insert === "\n");
        const selectionIndex = hasNewline ? sel.index + 1 : sel.index;
        q.setSelection({ index: length === 1 ? 0 : selectionIndex, length: 0 });
        onOutput?.(content);

        sel = q.getSelection();
        if (!sel) return;
        void formatSelection(sel, q.getFormat());
      });
    }

    void initQuill();

    return () => {
      mounted = false;
      quillRef.current = null;
      // Clear the container so Quill doesn't double-initialize on re-mount
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={readOnly ? "readonly" : ""} />;
});

export default MailQuill;
