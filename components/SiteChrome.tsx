"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuPath(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const { slug, rail, groups } = useMemo(() => parseNav(pathname), [pathname]);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 z-50 flex h-svh w-11 shrink-0 flex-col self-start border-r-2 border-ink bg-paper">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center border-b-2 border-ink bg-yellow"
          aria-label={open ? "關閉選單" : "打開選單"}
          aria-expanded={open}
          onClick={() => setMenuPath(open ? null : pathname)}
        >
          <HamburgerIcon open={open} />
        </button>
        <div className="hidden flex-1 items-start justify-center pt-4 md:flex">
          <span className="text-[13px] font-black tracking-[0.34em] text-muted [writing-mode:vertical-rl] whitespace-nowrap">
            {rail}
          </span>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="網站選單">
          <button
            type="button"
            className="absolute inset-0 bg-ink/70"
            aria-label="關閉選單"
            onClick={() => setMenuPath(null)}
          />
          <nav className="relative flex h-full w-[min(86vw,320px)] flex-col border-r-2 border-ink bg-paper">
            <div className="flex h-11 items-center justify-between border-b-2 border-ink bg-yellow px-3">
              <span className="text-sm font-black tracking-[0.18em]">選單</span>
              <button
                type="button"
                className="min-h-11 px-2 font-black"
                onClick={() => setMenuPath(null)}
              >
                關閉
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <p className="mb-3 text-[11px] font-black tracking-[0.2em] text-muted">
                你在：{hereLabel(pathname, slug)}
              </p>
              {groups.map((group) => (
                <section key={group.title} className="mb-5">
                  <h2 className="mb-2 text-[11px] font-black tracking-[0.2em] text-muted">
                    {group.title}
                  </h2>
                  <div className="border-2 border-ink bg-card">
                    {group.links.map((link) => {
                      const active = link.exact
                        ? pathname === link.href
                        : pathname === link.href || pathname.startsWith(`${link.href}/`);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
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

function parseNav(pathname: string) {
  const eventSlug = pathname.match(/^\/e\/([^/]+)/)?.[1];
  const showSlug = pathname.match(/^\/show\/([^/]+)/)?.[1];
  const adminSlug = pathname.match(/^\/admin\/e\/([^/]+)/)?.[1];
  const slug = eventSlug ?? showSlug ?? adminSlug ?? null;

  if (pathname.startsWith("/admin")) {
    return {
      slug,
      rail: "老師 ・ 控制台",
      groups: adminGroups(slug),
    };
  }
  if (showSlug) {
    return {
      slug: showSlug,
      rail: "設計課程 ・ 線上展覽",
      groups: publicGroups(showSlug),
    };
  }
  if (eventSlug) {
    return {
      slug: eventSlug,
      rail: "設計課程 ・ 路上觀察",
      groups: publicGroups(eventSlug),
    };
  }
  return {
    slug: null,
    rail: "設計課程 ・ 路上觀察",
    groups: [{ title: "入口", links: homeLinks() }],
  };
}

function publicGroups(slug: string): { title: string; links: MenuLink[] }[] {
  return [
    {
      title: "現場",
      links: [
        { href: `/e/${slug}`, label: "任務板", exact: true },
        { href: `/e/${slug}/join`, label: "加入／換組別" },
        { href: `/e/${slug}/gallery`, label: "成果牆" },
        { href: `/show/${slug}`, label: "展覽" },
      ],
    },
    {
      title: "老師",
      links: [
        { href: `/admin/e/${slug}`, label: "控制台", exact: true },
        { href: `/admin/e/${slug}/tasks`, label: "題庫" },
        { href: `/admin/e/${slug}/teams`, label: "組別" },
        { href: `/admin/e/${slug}/curate`, label: "策展" },
        { href: `/admin/e/${slug}/settings`, label: "設定" },
      ],
    },
    { title: "其他", links: homeLinks() },
  ];
}

function adminGroups(slug: string | null): { title: string; links: MenuLink[] }[] {
  const groups: { title: string; links: MenuLink[] }[] = [
    {
      title: "老師",
      links: [
        { href: "/admin/events", label: "所有場次" },
        ...(slug
          ? ([
              { href: `/admin/e/${slug}`, label: "控制台", exact: true },
              { href: `/admin/e/${slug}/tasks`, label: "題庫" },
              { href: `/admin/e/${slug}/teams`, label: "組別" },
              { href: `/admin/e/${slug}/curate`, label: "策展" },
              { href: `/admin/e/${slug}/settings`, label: "設定" },
            ] satisfies MenuLink[])
          : []),
      ],
    },
  ];
  if (slug) {
    groups.push({
      title: "現場／展覽",
      links: [
        { href: `/e/${slug}`, label: "學生任務板", exact: true },
        { href: `/e/${slug}/gallery`, label: "成果牆" },
        { href: `/show/${slug}`, label: "展覽" },
      ],
    });
  }
  groups.push({ title: "其他", links: homeLinks() });
  return groups;
}

function homeLinks(): MenuLink[] {
  return [
    { href: "/", label: "首頁", exact: true },
    { href: "/admin", label: "老師入口", exact: true },
  ];
}

function hereLabel(pathname: string, slug: string | null) {
  if (pathname === "/") return "首頁";
  if (pathname === "/admin" || pathname === "/admin/events") return "場次列表";
  if (pathname === "/admin/events/new") return "新增場次";
  if (slug && pathname === `/e/${slug}`) return "任務板";
  if (slug && pathname === `/e/${slug}/join`) return "加入組別";
  if (slug && pathname.startsWith(`/e/${slug}/task/`)) return "任務詳情";
  if (slug && pathname === `/e/${slug}/gallery`) return "成果牆";
  if (slug && pathname === `/show/${slug}`) return "展覽";
  if (slug && pathname === `/admin/e/${slug}`) return "控制台";
  if (slug && pathname === `/admin/e/${slug}/tasks`) return "題庫";
  if (slug && pathname === `/admin/e/${slug}/teams`) return "組別";
  if (slug && pathname === `/admin/e/${slug}/curate`) return "策展";
  if (slug && pathname === `/admin/e/${slug}/settings`) return "設定";
  return "路上觀察";
}
