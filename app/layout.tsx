import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import RootLayoutClient from "@/components/layout/RootLayoutClient";

export const metadata: Metadata = {
  title: "Gravity Telemetry",
  description: "A toolset for Infinite Lagrange players",
  openGraph: {
    type: "website",
    images: [{ url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/logo/logo.png` }],
  },
  twitter: {
    card: "summary_large_image",
    images: [`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/logo/logo.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent dark mode flash — apply theme before React hydrates.
            Tailwind's `darkMode: "selector"` keys off the `.dark` class on the
            html element. We also set FlyonUI's `data-theme` to the matching
            theme: FlyonUI resolves its color tokens (`--b1` etc.) from
            `data-theme`/`prefers-color-scheme`, so without an explicit value its
            inputs/buttons would follow the OS instead of our toggle (black
            inputs in light mode when the OS is dark). The explicit attribute
            outranks the `prefers-color-scheme` block and keeps the two in sync.
            AppHeader's toggle mirrors this exact target. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('theme')==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body>
        <Suspense>
          <RootLayoutClient>{children}</RootLayoutClient>
        </Suspense>
      </body>
    </html>
  );
}
