import { ReactNode } from "react";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

// FlyonUI reads the desired placement from the `--placement` CSS variable. The
// values have to be written as literal arbitrary-property classes so Tailwind
// generates them at build time (a template like `[--placement:${x}]` would not
// be seen by the JIT scanner).
const PLACEMENT_CLASS: Record<TooltipPlacement, string> = {
  top: "[--placement:top]",
  bottom: "[--placement:bottom]",
  left: "[--placement:left]",
  right: "[--placement:right]",
};

interface TooltipProps {
  /** Text/content shown in the bubble on hover. */
  content: ReactNode;
  /** Side the bubble appears on. Defaults to "top" (the old daisyUI default). */
  placement?: TooltipPlacement;
  /** Extra classes for the wrapper that the trigger lives in (layout/position). */
  className?: string;
  /** Extra classes for the bubble body. */
  bodyClassName?: string;
  /** The trigger element(s). Hovering anywhere over the wrapper shows the bubble. */
  children: ReactNode;
}

/**
 * Hover tooltip built on FlyonUI's `tooltip` component, driven by HSTooltip
 * (initialized once in {@link FlyonUIInit}). Drop-in replacement for daisyUI's
 * `du-tooltip` + `data-tip`.
 *
 * No explicit `.tooltip-toggle` is rendered, so HSTooltip falls back to using the
 * `.tooltip` wrapper itself as the trigger — meaning the whole wrapper is
 * hover-sensitive, matching the old daisyUI behavior.
 */
export default function Tooltip({
  content,
  placement = "top",
  className = "",
  bodyClassName = "",
  children,
}: TooltipProps) {
  return (
    <span className={`tooltip ${PLACEMENT_CLASS[placement]} ${className}`.trim()}>
      {children}
      <span
        className="tooltip-content tooltip-shown:opacity-100 tooltip-shown:visible"
        role="tooltip"
      >
        <span className={`tooltip-body ${bodyClassName}`.trim()}>{content}</span>
      </span>
    </span>
  );
}
