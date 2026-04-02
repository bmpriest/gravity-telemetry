"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import AppFooter from "./AppFooter";
import HomeContributors from "@/components/Home/Contributors";
import HomeChangelog from "@/components/Home/Changelog";
import HomeContact from "@/components/Home/Contact";
import { useUserStore } from "@/stores/userStore";
import { changelog } from "@/utils/changelog";

interface Props {
  children: React.ReactNode;
}

export default function RootLayoutClient({ children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const init = useUserStore((s) => s.init);
  const getUser = useUserStore((s) => s.getUser);

  const [showSidebar, setShowSidebar] = useState(true);
  const [showContributors, setShowContributors] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Sync modals with query params
  useEffect(() => {
    const v = searchParams.get("v");
    const ct = searchParams.get("ct");
    const c = searchParams.get("c");

    setShowContact(false);
    setShowChangelog(false);
    setShowContributors(false);

    if (c) setShowContact(true);
    else if (v) setShowChangelog(true);
    else if (ct) setShowContributors(true);
  }, [searchParams]);

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("v");
    params.delete("ct");
    params.delete("c");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname);
  }

  function openContributors() {
    router.push(`?ct=true`);
  }

  function openChangelog() {
    router.push(`?v=${changelog[changelog.length - 1].version}`);
  }

  function openContact() {
    router.push(`?c=true`);
  }

  function closeSidebarMobile() {
    if (window.innerWidth < 768) setShowSidebar(false);
  }

  // App init
  useEffect(() => {
    // Restore dark mode before first paint (also handled by inline script in layout.tsx)
    if (localStorage.getItem("theme") === "dark") {
      useUserStore.getState().setIsDarkMode(true);
      document.body.classList.add("dark");
    }

    const uid = localStorage.getItem("uid");
    const token = localStorage.getItem("token");
    const hasQuery = window.location.search.length > 0;
    const isTemporaryUser = (!uid || !token) && hasQuery;

    init(!isTemporaryUser);

    if (isTemporaryUser) {
      // Once query params are cleared, create user
      const handler = () => {
        if (window.location.search.length === 0) {
          window.removeEventListener("popstate", handler);
          void getUser(true);
        }
      };
      window.addEventListener("popstate", handler);
      return () => window.removeEventListener("popstate", handler);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Responsive sidebar
  useEffect(() => {
    if (window.innerWidth < 768) setShowSidebar(false);

    let previousWidth = window.innerWidth;
    function onResize() {
      const newWidth = window.innerWidth;
      if (previousWidth === newWidth) return;
      setShowSidebar(newWidth >= 768);
      previousWidth = newWidth;
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <AppHeader onToggleSidebar={() => setShowSidebar((v) => !v)} />

      <div className="flex h-full min-h-[calc(100dvh-4rem)] w-full items-start justify-between">
        {/* Sidebar with CSS slide transition */}
        <div
          className="transition-transform duration-500 ease-in-out"
          style={{ transform: showSidebar ? "translateX(0)" : "translateX(-20rem)" }}
        >
          {showSidebar && (
            <AppSidebar
              onContributors={openContributors}
              onChangelog={openChangelog}
              onContact={openContact}
              onClose={closeSidebarMobile}
            />
          )}
        </div>

        {/* Mobile overlay */}
        {showSidebar && (
          <div
            className="fixed left-0 top-0 z-10 h-dvh w-screen md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar spacer */}
        <div
          className="h-full w-0 shrink-0 transition-all duration-[0.75s]"
          style={{ width: showSidebar ? "18rem" : "0" }}
          aria-hidden="true"
        />

        <div className="flex w-full flex-col items-center justify-center">
          {children}
          <AppFooter />
        </div>
      </div>

      {/* Contributors modal */}
      {showContributors && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)] transition-opacity duration-500"
          onClick={closeModal}
        >
          <HomeContributors />
        </div>
      )}

      {/* Changelog modal */}
      {showChangelog && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)] transition-opacity duration-500"
          onClick={closeModal}
        >
          <HomeChangelog />
        </div>
      )}

      {/* Contact modal */}
      {showContact && (
        <div
          className="fixed left-0 top-0 z-20 flex h-dvh w-screen items-center justify-center bg-[rgba(0,0,0,0.5)] transition-opacity duration-500"
          onClick={closeModal}
        >
          <HomeContact />
        </div>
      )}
    </>
  );
}
