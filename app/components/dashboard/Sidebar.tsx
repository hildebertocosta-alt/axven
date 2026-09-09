import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";

export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type SidebarProps = {
  items: NavItem[];
  activeLabel: string;
  status?: { lastUpdated: string | null };
  variant?: "internal" | "portal";
};

export function Sidebar({ items, activeLabel, status, variant = "internal" }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-white/[0.07] bg-[#07080b] px-4 py-5 lg:flex">
      <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-2 py-1">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#ff5a3c]/20 bg-[#111117] shadow-[0_0_30px_rgba(255,90,60,0.08)]">
          <Image src="/axven-icon.png" alt="Axven Digital" fill sizes="44px" className="object-contain p-1.5" priority />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.34em] text-zinc-500">AXVEN DIGITAL</p>
          <h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-white">
            {variant === "portal" ? "Portal do Cliente" : "Command Center"}
          </h2>
        </div>
      </Link>

      {variant === "internal" ? (
        <div className="mb-6 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.055] to-white/[0.02] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ff5a3c]/20 bg-[#ff5a3c]/10 text-xs font-semibold text-[#ff8a70]">J</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Junior</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]" />
                Operação conectada
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-white/[0.06] pt-2.5 text-[10px] text-zinc-600">Atualização: {status?.lastUpdated ?? "tempo real"}</div>
        </div>
      ) : null}

      {items.length ? (
        <nav className="space-y-1">
          <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.26em] text-zinc-700">Navegação</p>
          {items.map((item) => {
            const isActive = item.label === activeLabel;
            return (
              <Link key={item.label} href={item.href} className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all duration-200 ${isActive ? "bg-gradient-to-r from-[#ff5a3c]/15 to-transparent text-white" : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200"}`}>
                {isActive ? <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[#ff5a3c] shadow-[0_0_12px_rgba(255,90,60,.8)]" /> : null}
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[13px] transition ${isActive ? "border-[#ff5a3c]/20 bg-[#ff5a3c]/10 text-[#ff8a70]" : "border-white/[0.05] bg-white/[0.025] text-zinc-600 group-hover:text-zinc-300"}`}>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {variant === "internal" ? (
        <div className="mt-auto border-t border-white/[0.06] pt-4">
          <div className="mb-3 px-3 text-[10px] leading-relaxed text-zinc-700">Crescimento construído com dados.</div>
          <LogoutButton />
        </div>
      ) : null}
    </aside>
  );
}
