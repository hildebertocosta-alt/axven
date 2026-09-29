import Image from "next/image";
import type { ReactNode } from "react";

type TopbarProps = { title: string; subtitle: string; actions?: ReactNode; busca?: boolean };

export function Topbar({ title, subtitle, actions, busca = true }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[78px] flex-col gap-4 border-b border-white/[0.065] bg-[#08090d]/88 px-5 py-4 backdrop-blur-2xl lg:px-7 xl:flex-row xl:items-center xl:justify-between xl:px-9">
      <div className="flex items-center gap-3">
        {/* O menu lateral (com o logo) some abaixo de lg: no celular o "A" da Axven aparece aqui. */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#ff5a3c]/20 bg-[#111117] lg:hidden">
          <Image src="/axven-icon.png" alt="Axven Digital" fill sizes="40px" className="object-contain p-1.5" priority />
        </div>
        <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a3c] shadow-[0_0_9px_rgba(255,90,60,.8)]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{subtitle}</p>
        </div>
        <h1 className="text-xl font-semibold tracking-[-0.025em] text-white xl:text-[22px]">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {busca ? (
          <label className="group flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-xs text-zinc-600 transition focus-within:border-[#ff5a3c]/30 focus-within:bg-white/[0.04]">
            <span className="text-base text-zinc-600">⌕</span>
            <input className="w-36 bg-transparent text-zinc-300 outline-none placeholder:text-zinc-700 xl:w-44" placeholder="Buscar no Hub" aria-label="Buscar" />
            <span className="hidden rounded-md border border-white/[0.06] px-1.5 py-0.5 text-[9px] text-zinc-700 xl:inline">⌘ K</span>
          </label>
        ) : null}
        {actions}
      </div>
    </header>
  );
}
