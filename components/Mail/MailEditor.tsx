"use client";

import { useState, useRef, useEffect } from "react";
import { DataSet, RegExpMatcher, englishDataset, englishRecommendedTransformers, pattern } from "obscenity";
import type { Delta, Op } from "quill/core";
import MailQuill, { type MailQuillHandle } from "./MailQuill";
import { formattingColors } from "@/utils/mailTemplates";

interface Props {
  clearText: boolean;
  template: Op[] | undefined;
  onOutput: (text: string) => void;
  onOutputOps: (ops: Op[]) => void;
}

const presetColors = Object.values(formattingColors);

const dataset = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .addPhrase((p) => p.setMetadata({ originalWord: "taiwan" }).addPattern(pattern`taiwan`))
  .addPhrase((p) => p.setMetadata({ originalWord: "jin ping" }).addPattern(pattern`jin[ ]ping`))
  .addPhrase((p) => p.setMetadata({ originalWord: "pooh" }).addPattern(pattern`pooh`))
  .addPhrase((p) => p.setMetadata({ originalWord: "hong kong" }).addPattern(pattern`hk`).addPattern(pattern`hong[ ]kong`))
  .addPhrase((p) => p.setMetadata({ originalWord: "communist" }).addPattern(pattern`communist`).addPattern(pattern`commie`))
  .addPhrase((p) => p.setMetadata({ originalWord: "falun" }).addPattern(pattern`fal[?]n`))
  .addPhrase((p) => p.setMetadata({ originalWord: "tiananmen square" }).addPattern(pattern`tiananmen`))
  .addPhrase((p) => p.setMetadata({ originalWord: "dalai lama" }).addPattern(pattern`dalai[ ]lama`))
  .addPhrase((p) => p.setMetadata({ originalWord: "hongzhi" }).addPattern(pattern`hongzhi`))
  .addPhrase((p) => p.setMetadata({ originalWord: "ethnic cleansing" }).addPattern(pattern`ethnic[ ]cleansing`))
  .addPhrase((p) => p.setMetadata({ originalWord: "torture" }).addPattern(pattern`torture`));

export default function MailEditor({ clearText, template, onOutput, onOutputOps }: Props) {
  const [underline, setUnderline] = useState(false);
  const [currentColor, setCurrentColor] = useState("#ffffff");
  const [openColorMenu, setOpenColorMenu] = useState(false);
  const [outputText, setOutputText] = useState("");
  const [profaneWords, setProfaneWords] = useState<string[]>([]);
  const quillRef = useRef<MailQuillHandle>(null);
  const matcherRef = useRef<RegExpMatcher | null>(null);

  useEffect(() => {
    matcherRef.current = new RegExpMatcher({ ...dataset.build(), ...englishRecommendedTransformers });
  }, []);

  // clearText prop → imperative clear
  const prevClearText = useRef(clearText);
  useEffect(() => {
    if (clearText && !prevClearText.current) {
      quillRef.current?.clearText();
      setUnderline(false);
      setCurrentColor("#ffffff");
    }
    prevClearText.current = clearText;
  }, [clearText]);

  // template prop → set contents
  const prevTemplate = useRef(template);
  useEffect(() => {
    if (template && template !== prevTemplate.current) {
      quillRef.current?.setContents(template);
    }
    prevTemplate.current = template;
  }, [template]);

  // Sync underline/color to Quill imperatively
  const prevUnderline = useRef(underline);
  useEffect(() => {
    if (underline !== prevUnderline.current) quillRef.current?.setUnderline(underline);
    prevUnderline.current = underline;
  }, [underline]);

  const prevColor = useRef(currentColor);
  useEffect(() => {
    if (currentColor !== prevColor.current) quillRef.current?.setColor(currentColor);
    prevColor.current = currentColor;
  }, [currentColor]);

  function selectColor(color: string) {
    setCurrentColor(color);
    setOpenColorMenu(false);
  }

  function handleEvent(ul: boolean, col: string | string[]) {
    setUnderline(ul);
    if (typeof col === "string") setCurrentColor(col);
  }

  const cooldownRef = useRef(false);
  const queuedRef = useRef<Delta | Op[] | null>(null);

  function handleOutput(output: Delta | Op[]) {
    if (cooldownRef.current) { queuedRef.current = output; return; }
    cooldownRef.current = true;
    queuedRef.current = null;
    setTimeout(() => {
      cooldownRef.current = false;
      if (queuedRef.current) handleOutput(queuedRef.current);
    }, 500);

    localStorage.setItem("autosave", JSON.stringify(output));

    let outputString = "";
    let previousIsUnderline = false;
    let previousColor = "#ffffff";

    const ops = "ops" in (output as Delta) ? (output as Delta).ops : (output as Op[]);
    onOutputOps(ops);

    for (const op of ops) {
      outputString += insertFormatting(op);
    }

    while (outputString.endsWith("#r") || outputString.endsWith("#e") || outputString.endsWith("#W")) {
      outputString = outputString.slice(0, -2);
    }

    setOutputText(outputString);
    onOutput(outputString);
    checkProfanity(outputString);

    function insertFormatting(op: Op) {
      const insert = op.insert as string;
      const isCoordinate = /\(\d{1,4},\d{1,4}\)/.test(insert);
      let string = insert.replaceAll("\n", "#r");

      const ul = op.attributes?.underline;
      if (!isCoordinate && ul) {
        if (!previousIsUnderline) string = `#E${string}`;
        previousIsUnderline = true;
      } else if (!isCoordinate && !ul) {
        if (previousIsUnderline) string = `#e${string}`;
        previousIsUnderline = false;
      }

      let col = op.attributes?.color as string | string[];
      if (col && !isCoordinate) {
        if (typeof col !== "string") col = col[0];
        if (col !== previousColor) string = `#c${col.slice(1)}${string}`;
        previousColor = col;
        string = Object.entries(formattingColors).reduce((result, [key, value]) => {
          const regex = new RegExp(`#c${value.slice(1)}`, "g");
          return result.replace(regex, `#${key}`);
        }, string);
      }
      return string;
    }
  }

  function checkProfanity(text: string) {
    if (!matcherRef.current?.hasMatch(text)) { setProfaneWords([]); return; }
    const matches = matcherRef.current.getAllMatches(text);
    const metadata = matches.map((m) => dataset.getPayloadWithPhraseMetadata(m));
    setProfaneWords(metadata.map((d) => d.phraseMetadata?.originalWord ?? ""));
  }

  return (
    <form className="w-full rounded-2xl shadow md:w-[25rem] lg:w-[40rem] xl:w-[50rem]" onClick={() => setOpenColorMenu(false)}>
      <div className="w-full rounded-2xl border border-neutral-600 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-600 px-3 py-2" onClick={() => setOpenColorMenu(false)}>
          <div className="flex flex-wrap items-center divide-neutral-600 sm:divide-x sm:rtl:divide-x-reverse">
            <div className="flex items-center space-x-1 sm:pe-4 rtl:space-x-reverse">
              <div className="du-tooltip" data-tip="Underline">
                <button
                  className={`cursor-pointer rounded p-1 text-neutral-400 transition hover:bg-neutral-600 hover:text-white ${underline ? "bg-neutral-600 text-white" : ""}`}
                  type="button"
                  onClick={() => setUnderline((u) => !u)}
                >
                  <img className="size-6 select-none invert" src="/ui/underline.svg" aria-hidden="true" />
                </button>
              </div>
              <div className="du-tooltip relative" data-tip="Text Color">
                <button
                  className={`cursor-pointer rounded p-1 text-neutral-400 transition hover:bg-neutral-600 hover:text-white ${openColorMenu ? "bg-neutral-600 text-white" : ""}`}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpenColorMenu((o) => !o); }}
                >
                  <img className="size-6 select-none invert" src="/ui/colorGenerator.svg" aria-hidden="true" />
                </button>
                <div className="absolute bottom-0 h-[3px] w-8 rounded-full" style={{ backgroundColor: currentColor }} />
                {openColorMenu && (
                  <div className="fo-tooltip-content visible -left-6 top-8 opacity-100" role="popover" onClick={(e) => e.stopPropagation()}>
                    <div className="fo-tooltip-body flex w-48 flex-col items-center justify-center gap-3 rounded-lg bg-neutral-600 p-4 text-start shadow">
                      <div className="flex w-full flex-wrap items-center justify-center gap-1">
                        {presetColors.map((c) => (
                          <button key={c} type="button" className="size-7 rounded-full border border-neutral-700 shadow-sm transition hover:scale-110 hover:shadow" style={{ backgroundColor: c }} onClick={(e) => { e.stopPropagation(); selectColor(c); }} />
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <p className="font-medium text-white">Custom</p>
                        <div className="relative size-7">
                          <button type="button" className="size-full rounded-full border border-neutral-700 shadow-sm transition-transform hover:scale-110 hover:shadow" style={{ backgroundColor: currentColor }} />
                          <input className="absolute left-0 top-0 size-full rounded-full opacity-0" type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center space-x-6 ps-4 lg:space-x-10 rtl:space-x-reverse">
              <p className="text-white">
                <span className="hidden text-white lg:inline">Output length: </span>
                <strong className="text-white">{outputText.length.toLocaleString()}</strong>
                <span className="text-white">/{Number(1000).toLocaleString()}</span>
              </p>
              <div className="inline-flex items-center justify-center gap-1 text-white">
                <p>
                  <span className="hidden text-white lg:inline">Profanity detected: </span>
                  <strong className="text-white">{profaneWords.length}</strong>
                  <span className="inline text-white lg:hidden"> detections</span>
                </p>
                <div className="group relative">
                  <img className="size-5 cursor-help select-none invert" src="/ui/question.svg" alt="Profanity filter information" />
                  <div className="fo-tooltip-content pointer-events-none visible top-5 opacity-0 group-hover:opacity-100 max-lg:-right-4 lg:left-1/2 lg:max-xl:-translate-x-1/2 xl:-left-4" role="popover">
                    <div className="fo-tooltip-body flex w-64 flex-col items-center justify-center gap-3 rounded-lg bg-neutral-600 p-4 text-start shadow">
                      <p className="text-white">Uses a basic profanity filter that does not reflect Infinite Lagrange&apos;s actual profanity filter.</p>
                      <p className="text-white">Gives a general idea if your mail will be blocked or not.</p>
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-lg text-white">Infringing words:</p>
                        <ul className="mb-4 flex w-full flex-col items-center justify-center text-base font-normal text-neutral-300">
                          {profaneWords.length > 0 ? profaneWords.map((w) => <li key={w} className="text-neutral-200">{w}</li>) : <p className="text-neutral-200">None!</p>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="editor-bg h-96 rounded-b-2xl">
          <MailQuill
            ref={quillRef}
            underline={underline}
            color={currentColor}
            onEvent={handleEvent}
            onOutput={handleOutput}
          />
        </div>
      </div>
    </form>
  );
}
