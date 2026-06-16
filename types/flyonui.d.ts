// FlyonUI's JavaScript exposes its component controllers (HSTooltip, HSAccordion,
// …) and an aggregate `HSStaticMethods.autoInit()` on the global window once
// `flyonui/flyonui` has been imported on the client. Declare that here so the
// init code in FlyonUIInit can call it in a type-safe way.
import type { IStaticMethods } from "flyonui/flyonui";

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

export {};
