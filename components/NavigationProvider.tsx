"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "@/components/LoadingMark";

const NavCtx = createContext<{
  pending: boolean;
  start: (label?: string) => void;
  stop: () => void;
}>({
  pending: false,
  start: () => {},
  stop: () => {},
});

export function useNavPending() {
  return useContext(NavCtx);
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(false);
  const [label, setLabel] = useState("載入中");

  const start = useCallback((nextLabel = "載入中") => {
    setLabel(nextLabel);
    setPending(true);
  }, []);

  const stop = useCallback(() => setPending(false), []);

  return (
    <NavCtx.Provider value={{ pending, start, stop }}>
      {children}
      {pending ? <LoadingOverlay label={label} /> : null}
      <Suspense fallback={null}>
        <NavigationListener pending={pending} start={start} stop={stop} />
      </Suspense>
    </NavCtx.Provider>
  );
}

function NavigationListener({
  pending,
  start,
  stop,
}: {
  pending: boolean;
  start: (label?: string) => void;
  stop: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    stop();
  }, [pathname, search, stop]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(stop, 10000);
    return () => window.clearTimeout(timer);
  }, [pending, stop]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (link.getAttribute("target") === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      if (url.pathname.startsWith("/admin") && window.location.pathname.startsWith("/admin")) {
        return;
      }
      start("載入中");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [start]);

  return null;
}
