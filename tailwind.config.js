import daisyUI from "daisyui";
import flowbite from "flowbite/plugin";
import flyonUI from "flyonui";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    colors: {
      body: "var(--bg-color)"
    },
    extend: {
      screens: {
        lg: "1025px"
      }
    }
  },
  plugins: [daisyUI, flowbite, flyonUI],
  daisyui: {
    prefix: "du-",
    logs: false
  },
  flyonui: {
    prefix: "fo-",
    logs: false
  },
  darkMode: "selector",
  future: {
    hoverOnlyWhenSupported: true
  }
};
