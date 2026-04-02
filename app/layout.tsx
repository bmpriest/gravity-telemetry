import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import RootLayoutClient from "@/components/layout/RootLayoutClient";

export const metadata: Metadata = {
  title: "Gravity Assist",
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
        {/* Prevent dark mode flash — apply theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');document.body.classList.add('dark');}}catch(e){}})();`,
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
