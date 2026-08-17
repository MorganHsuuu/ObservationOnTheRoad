"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminEventNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const links = [
    ["控制台", `/admin/e/${slug}`],
    ["題庫", `/admin/e/${slug}/tasks`],
    ["組別", `/admin/e/${slug}/teams`],
    ["策展", `/admin/e/${slug}/curate`],
    ["設定", `/admin/e/${slug}/settings`],
  ] as const;

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b-2 border-ink bg-paper py-2 pr-3 pl-14 md:px-3">
      <Link href="/admin/events" className="min-h-11 px-2 font-black">
        ← 場次
      </Link>
      {links.map(([label, href]) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`min-h-11 px-3 font-black ${active ? "bg-ink text-paper" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
