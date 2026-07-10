import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type SidebarProps = {
  items: NavItem[];
  activeLabel: string;
  status?: {
    lastUpdated: string | null;
  };
};

export function Sidebar({ items, activeLabel, status }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/10 bg-zinc-950/90 px-5 py-6 backdrop-blur-xl lg:flex">
      <div className="mb-6 flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl">
          <Image
            src="/axven-icon-provisorio.png"
            alt="Axven"
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-zinc-400">
            AXVEN
          </p>
          <h2 className="text-lg font-semibold text-white">Marketing Hub</h2>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D85A30]/20 text-sm font-semibold text-[#f0a480]">
            J
          </div>
          <div>
            <p className="font-medium text-white">Junior</p>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Meta Ads: conectado
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          Última atualização: {status?.lastUpdated ?? "—"}
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = item.label === activeLabel;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                isActive
                  ? "bg-[#D85A30]/15 text-white shadow-lg shadow-[#D85A30]/10"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-base">
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
