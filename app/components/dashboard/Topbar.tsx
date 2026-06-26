import type { ReactNode } from "react";

type TopbarProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 bg-zinc-950/70 px-6 py-5 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-sm font-medium text-cyan-400">{subtitle}</p>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-400">
          <span>⌕</span>
          <input
            className="w-40 bg-transparent outline-none placeholder:text-zinc-500"
            placeholder="Buscar"
            aria-label="Buscar"
          />
        </label>
        {actions}
      </div>
    </header>
  );
}
