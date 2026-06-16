"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Initializes FlyonUI's JavaScript-driven components (tooltips, accordion, …)
 * for the Next.js App Router.
 *
 * FlyonUI auto-initializes once on the native `load` event, but in a single-page
 * app the DOM keeps changing after that without a full reload: on route changes,
 * when modals open via query params, and when async data renders fresh markup.
 * Any `.tooltip` / `.accordion` added after the initial pass would otherwise stay
 * dead. We therefore re-run `HSStaticMethods.autoInit()` — which is idempotent
 * (it skips already-initialized elements) — both on navigation and whenever the
 * DOM mutates, debounced so a burst of changes collapses into a single call.
 *
 * FlyonUI's JS references `window` at import time, so it is imported dynamically
 * inside the effect (browser only) — a static top-level import crashes server
 * prerendering with "window is not defined".
 */
export default function FlyonUIInit() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | undefined;
    let timer: ReturnType<typeof setTimeout>;

    import("flyonui/flyonui").then(() => {
      if (cancelled) return;
      const init = () => window.HSStaticMethods?.autoInit();

      // Initial pass for whatever is already mounted on this route.
      init();

      // Catch async-rendered, modal, and state-toggled content. Debounced so heavy
      // interactions (e.g. typing in the mail editor) don't trigger a scan per
      // mutation.
      observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(init, 200);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
