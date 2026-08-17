"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearStoredTeam, readStoredTeam } from "@/lib/team-storage";

type MenuLink = {
  href: string;
  label: string;
  exact?: boolean;
  logout?: boolean;
};

type ChromeTools = {
  onRefresh?: () => void;
  busy?: boolean;
  updatedAt?: string;
};

const TEACHER_EVENT_KEY = "observe:teacher-event";

const ToolsCtx = createContext<{
  setTools: (tools: ChromeTools) => void;
}>({ setTools: () => {} });

export function useChromeTools(tools: ChromeTools) {
  const { setTools } = useContext(ToolsCtx);
  const onRefresh = tools.onRefresh;
  const busy = tools.busy;
  const updatedAt = tools.updatedAt;
  useEffect(() => {
    setTools({ onRefresh, busy, updatedAt });
    return () => setTools({});
  }, [busy, onRefresh, setTools, updatedAt]);
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [person, setPerson] = useState("");
  const [teacherEventSlug, setTeacherEventSlug] = useState<string | null>(null);
  const [tools, setTools] = useState<ChromeTools>({});
  const open = menuPath === pathname;
  const setToolsStable = useCallback((next: ChromeTools) => setTools(next), []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuPath(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const fromAdmin = pathname.match(/^\/admin\/e\/([^/]+)/)?.[1];
    if (fromAdmin) {
      sessionStorage.setItem(TEACHER_EVENT_KEY, fromAdmin);
      setTeacherEventSlug(fromAdmin);
      return;
    }
    setTeacherEventSlug(sessionStorage.getItem(TEACHER_EVENT_KEY));
  }, [pathname]);

  const { slug, groups } = useMemo(
    () => parseNav(pathname, Boolean(person), teacherEventSlug),
    [pathname, person, teacherEventSlug],
  );
  const title = hereLabel(pathname, slug);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const eventSlug = pathname.match(/^\/e\/([^/]+)/)?.[1];
      if (!eventSlug) {
        setPerson("");
        return;
      }
      const stored = readStoredTeam(eventSlug);
      setPerson(stored ? `${stored.teamCode}・${stored.studentName}` : "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const label = person || title;

  return (
    <ToolsCtx.Provider value={{ setTools: setToolsStable }}>
      <div className="flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-11 shrink-0 border-b-2 border-ink bg-yellow">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center border-r-2 border-ink"
            aria-label={open ? "關閉選單" : "打開選單"}
            aria-expanded={open}
            onClick={() => setMenuPath(open ? null : pathname)}
          >
            <HamburgerIcon open={open} />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-between">
            <p className="min-w-0 truncate px-3 text-sm font-black">{label}</p>
            {tools.onRefresh ? (
              <div className="flex h-11 shrink-0 items-center border-l-2 border-ink">
                {tools.updatedAt ? (
                  <span className="px-2.5 text-[11px] font-black tabular-nums text-yellow-deep">
                    {tools.updatedAt}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={tools.onRefresh}
                  disabled={tools.busy}
                  aria-label="重新整理"
                  className="flex h-11 w-11 items-center justify-center border-l-2 border-ink text-lg font-black active:bg-card disabled:text-muted"
                >
                  {tools.busy ? "…" : "↻"}
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {open ? (
          <div className="fixed inset-x-0 top-11 bottom-0 z-[70]" role="dialog" aria-modal="true" aria-label="網站選單">
            <button
              type="button"
              className="absolute inset-0 bg-ink/70"
              aria-label="關閉選單"
              onClick={() => setMenuPath(null)}
            />
            <nav className="relative flex h-full w-[min(86vw,320px)] flex-col border-r-2 border-ink bg-paper">
              <div className="flex-1 overflow-y-auto px-3 py-4">
                {groups.map((group) => (
                  <section key={group.title || group.links[0]?.href} className="mb-5">
                    {group.title ? (
                      <h2 className="mb-2 text-[11px] font-black tracking-[0.2em] text-muted">
                        {group.title}
                      </h2>
                    ) : null}
                    <div className="border-2 border-ink bg-card">
                      {group.links.map((link) => {
                        const active = link.exact
                          ? pathname === link.href
                          : pathname === link.href || pathname.startsWith(`${link.href}/`);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => {
                              if (link.logout && slug) {
                                clearStoredTeam(slug);
                                setPerson("");
                              }
                              setMenuPath(null);
                            }}
                            className={`block min-h-12 border-b-2 border-ink px-3 py-3 font-black last:border-b-0 ${
                              active ? "bg-ink text-paper" : ""
                            }`}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </nav>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ToolsCtx.Provider>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5" aria-hidden>
      <span
        className={`absolute left-0 block h-[3px] w-5 bg-ink transition-transform ${
          open ? "top-[6.5px] rotate-45" : "top-0"
        }`}
      />
      <span
        className={`absolute top-[6.5px] left-0 block h-[3px] w-5 bg-ink transition-opacity ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 block h-[3px] w-5 bg-ink transition-transform ${
          open ? "top-[6.5px] -rotate-45" : "top-[13px]"
        }`}
      />
    </span>
  );
}

function parseNav(pathname: string, joined: boolean, teacherEventSlug: string | null) {
  const eventSlug = pathname.match(/^\/e\/([^/]+)/)?.[1];
  const showSlug = pathname.match(/^\/show\/([^/]+)/)?.[1];
  const adminSlug = pathname.match(/^\/admin\/e\/([^/]+)/)?.[1];
  const slug = eventSlug ?? showSlug ?? adminSlug ?? null;

  if (pathname.startsWith("/admin")) {
    return { slug, role: "teacher" as const, groups: teacherGroups(slug) };
  }
  if (showSlug) {
    if (teacherEventSlug === showSlug) {
      return { slug: showSlug, role: "teacher" as const, groups: teacherGroups(showSlug) };
    }
    return { slug: showSlug, role: "public" as const, groups: showGroups(showSlug) };
  }
  if (eventSlug) {
    if (teacherEventSlug === eventSlug) {
      return { slug: eventSlug, role: "teacher" as const, groups: teacherGroups(eventSlug) };
    }
    return {
      slug: eventSlug,
      role: "student" as const,
      groups: studentGroups(eventSlug, joined),
    };
  }
  return { slug: null, role: "public" as const, groups: homeGroups() };
}

function studentGroups(slug: string, joined: boolean): { title: string; links: MenuLink[] }[] {
  const links: MenuLink[] = [
    { href: `/e/${slug}`, label: "任務板", exact: true },
    { href: `/e/${slug}/gallery`, label: "成果牆" },
  ];
  if (joined) {
    links.push({ href: `/e/${slug}/join`, label: "登出", logout: true });
  }
  return [{ title: "", links }];
}

function teacherGroups(slug: string | null): { title: string; links: MenuLink[] }[] {
  const links: MenuLink[] = [{ href: "/admin/events", label: "所有場次" }];
  if (slug) {
    links.push(
      { href: `/admin/e/${slug}`, label: "控制台", exact: true },
      { href: `/admin/e/${slug}/tasks`, label: "題庫" },
      { href: `/admin/e/${slug}/teams`, label: "組別" },
      { href: `/admin/e/${slug}/curate`, label: "成果管理" },
      { href: `/e/${slug}/gallery`, label: "成果牆" },
      { href: `/admin/e/${slug}/settings`, label: "設定" },
    );
  }
  return [{ title: "", links }];
}

function showGroups(slug: string): { title: string; links: MenuLink[] }[] {
  return [
    {
      title: "",
      links: [
        { href: `/e/${slug}/gallery`, label: "成果牆" },
        { href: `/show/${slug}`, label: "展覽" },
      ],
    },
  ];
}

function homeGroups(): { title: string; links: MenuLink[] }[] {
  return [
    {
      title: "",
      links: [
        { href: "/", label: "首頁", exact: true },
        { href: "/admin", label: "老師入口", exact: true },
      ],
    },
  ];
}

function hereLabel(pathname: string, slug: string | null) {
  if (pathname === "/") return "路上觀察";
  if (pathname === "/admin" || pathname === "/admin/events") return "場次";
  if (pathname === "/admin/events/new") return "新增場次";
  if (slug && pathname === `/e/${slug}`) return "任務板";
  if (slug && pathname === `/e/${slug}/join`) return "加入組別";
  if (slug && pathname.startsWith(`/e/${slug}/task/`)) return "任務";
  if (slug && pathname === `/e/${slug}/gallery`) return "成果牆";
  if (slug && pathname === `/show/${slug}`) return "展覽";
  if (slug && pathname === `/admin/e/${slug}`) return "控制台";
  if (slug && pathname === `/admin/e/${slug}/tasks`) return "題庫";
  if (slug && pathname === `/admin/e/${slug}/teams`) return "組別";
  if (slug && pathname === `/admin/e/${slug}/curate`) return "成果管理";
  if (slug && pathname === `/admin/e/${slug}/settings`) return "設定";
  return "路上觀察";
}
