import flyonui from "flyonui";
// Note the explicit `.js`: FlyonUI ships no package "exports" map, so ESM config
// loaders (Next/Tailwind) can't resolve the extensionless "flyonui/plugin".
import flyonuiPlugin from "flyonui/plugin.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // Scan FlyonUI's JS so the classes/variants its components toggle at runtime
    // (e.g. `tooltip-shown:`, `accordion-item-active:`) are generated.
    "./node_modules/flyonui/dist/js/*.js"
  ],
  safelist: [
    {
      pattern: /col-start-/,
    },
    {
      pattern: /row-start-/,
    }
  ],
  theme: {
    extend: {
      colors: {
        body: "var(--bg-color)"
      },
      screens: {
        lg: "1025px"
      }
    }
  },
  // `flyonui` provides the component styles (unprefixed); `flyonui/plugin` adds the
  // JS-state variants used by HSTooltip / HSAccordion.
  plugins: [flyonui, flyonuiPlugin],
  flyonui: {
    logs: false
  },
  darkMode: "selector",
  future: {
    hoverOnlyWhenSupported: true
  }
};
