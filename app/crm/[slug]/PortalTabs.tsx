"use client";

import Link from "next/link";

export function PortalTabs({ slug, active }: { slug: string; active: "kanban" | "conversas" | "disparo" }) {
  const tabs = [
    { key: "kanban" as const, label: "Kanban", href: `/crm/${slug}` },
    { key: "conversas" as const, label: "Conversas", href: `/crm/${slug}/conversas` },
    { key: "disparo" as const, label: "Disparo", href: `/crm/${slug}/disparo` },
  ];

  return (
    <div className="mb-6 flex gap-2 border-b border-white/10 pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            active === tab.key
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
