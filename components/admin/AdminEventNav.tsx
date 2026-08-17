"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminEventNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const links = [
    ["控制台", `/admin/e/${slug}`],
    ["題庫", `/admin/e/${slug}/tasks`],
    ["組別", `/admin/e/${slug}/teams`],
    ["作品牆", `/admin/e/${slug}/curate`],
    ["設定", `/admin/e/${slug}/settings`],
  ] as const;

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b-2 border-ink bg-paper px-3 pt-5 pb-3">
      <Link href="/admin/events" className="inline-flex min-h-11 items-center px-2 font-black leading-none">
        ← 場次
      </Link>
      {links.map(([label, href]) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex min-h-11 items-center px-3 font-black leading-none ${active ? "bg-ink text-paper" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
