import Link from "next/link";
import type { ReactNode } from "react";

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
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-sm font-semibold text-white">
          G
        </div>
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-zinc-400">
            GROWTHWAVE
          </p>
          <h2 className="text-lg font-semibold text-white">Marketing Hub</h2>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20 text-sm font-semibold text-violet-200">
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
        <p className="mt-3 text-sm text-zinc-400">8 clientes ativos</p>
        <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-200">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Meta Ads: conectado
          </div>
          <div className="mt-1 text-zinc-400">
            Última atualização: {status?.lastUpdated ?? "—"}
          </div>
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
                  ? "bg-white/10 text-white shadow-lg shadow-cyan-500/10"
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
    </aside>
  );
}
