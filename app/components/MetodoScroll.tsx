"use client";

import { useEffect, useRef, useState } from "react";

// Seção do Método Axven contada pela rolagem: anúncio → conversa com origem → atendimento → venda → relatório.
// Sem biblioteca: a seção fica presa (sticky) e o progresso da rolagem (0 a 1) move as peças.
// Quem pede "reduzir movimento" vê a grade estática das 5 etapas.

export type Etapa = { n: string; nome: string; texto: string; onde: string; verde?: boolean };

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

function useProgresso(ref: React.RefObject<HTMLDivElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const medir = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(total > 0 ? clamp(-r.top / total) : 0);
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => { window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); if (raf) cancelAnimationFrame(raf); };
  }, [ref]);
  return p;
}

function Bolha({ de, t, children }: { de: "lead" | "axven"; t: number; children: React.ReactNode }) {
  return (
    <div
      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${de === "lead" ? "self-start rounded-bl-md bg-[#26262E] text-white" : "self-end rounded-br-md bg-[#F2551F] text-white"}`}
      style={{ opacity: t, transform: `translateY(${(1 - t) * 14}px)` }}
    >
      {children}
    </div>
  );
}

function Palco({ p }: { p: number }) {
  // 1 · Atrair: card do anúncio
  const encolhe = seg(p, 0.17, 0.29);
  const toque = seg(p, 0.08, 0.16);
  // 2 · Rastrear: conversa com a origem
  const chat = seg(p, 0.2, 0.3);
  const origem = seg(p, 0.26, 0.34);
  const destaqueOrigem = p > 0.24 && p < 0.42;
  // 3 · Atender
  const b1 = seg(p, 0.31, 0.36);
  const b2 = seg(p, 0.41, 0.45);
  const b3 = seg(p, 0.46, 0.5);
  const b4 = seg(p, 0.51, 0.55);
  // 4 · Converter
  const recibo = seg(p, 0.6, 0.68);
  const meta = seg(p, 0.7, 0.76);
  // 5 · Decidir
  const sai = seg(p, 0.8, 0.86);
  const rel = seg(p, 0.82, 0.88);
  const barras = [seg(p, 0.85, 0.89), seg(p, 0.87, 0.91), seg(p, 0.89, 0.93), seg(p, 0.91, 0.96)];

  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[340px] overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#111117] shadow-[0_40px_120px_-40px_rgba(242,85,31,.45)] sm:h-[560px]">
      <div className="absolute inset-x-0 top-0 flex h-9 items-center justify-center"><span className="h-1.5 w-16 rounded-full bg-white/10" /></div>

      {/* 1 · Anúncio */}
      <div
        className="absolute inset-x-5 top-12 rounded-3xl border border-white/10 bg-[#17171D] p-4"
        style={{ opacity: 1 - encolhe, transform: `translateY(${-encolhe * 60}px) scale(${1 - encolhe * 0.35})`, transformOrigin: "top center" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-full bg-gradient-to-br from-[#F2551F] to-[#ff9a6c]" />
          <div><p className="text-[13px] font-bold">Seu negócio</p><p className="text-[11px] text-[#9B9BA4]">Patrocinado</p></div>
        </div>
        <div className="mt-3 flex h-48 items-end rounded-2xl bg-gradient-to-br from-[#F2551F] via-[#c43d12] to-[#2a120a] p-4">
          <p className="text-2xl font-bold leading-tight">Sua oferta<br />aqui.</p>
        </div>
        <div
          className="mt-3 flex items-center justify-between rounded-xl px-3.5 py-3 text-[13px] font-bold transition-colors"
          style={{ background: toque > 0.5 ? "#F2551F" : "#26262E", boxShadow: toque > 0 && toque < 1 ? `0 0 0 ${toque * 10}px rgba(242,85,31,${0.35 * (1 - toque)})` : "none" }}
        >
          Enviar mensagem <span>→</span>
        </div>
      </div>

      {/* 2 e 3 · Conversa */}
      <div className="absolute inset-x-0 bottom-0 top-9 flex flex-col px-4 pb-4" style={{ opacity: chat * (1 - sai), transform: `translateY(${(1 - chat) * 30}px)` }}>
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#26262E] text-xs font-bold">M</span>
          <div className="flex-1"><p className="text-[13px] font-bold">Mariana</p><p className="text-[11px] text-[#9B9BA4]">novo contato · WhatsApp</p></div>
        </div>
        <div
          className={`mt-3 w-fit rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${destaqueOrigem ? "border-[#F2551F] bg-[#F2551F]/15 text-white" : "border-white/10 text-[#9B9BA4]"}`}
          style={{ opacity: origem, transform: `scale(${0.9 + origem * 0.1})` }}
        >
          Origem: Anúncio 03 · campanha Black
        </div>
        <div className="mt-4 flex flex-1 flex-col gap-2">
          <Bolha de="lead" t={b1}>Oi! Vi o anúncio. Qual o valor?</Bolha>
          <Bolha de="axven" t={b2}>Oi, Mariana! Fica R$ 1.497 em até 10x. Quer que eu reserve um horário?</Bolha>
          <Bolha de="axven" t={b3}>Tenho amanhã às 10h ou às 15h. Qual fica melhor?</Bolha>
          <Bolha de="lead" t={b4}>15h 👍</Bolha>
        </div>
      </div>

      {/* 4 · Venda */}
      <div
        className="absolute inset-x-5 bottom-5 rounded-3xl border-2 border-[#81F002] bg-[#0f1a06] p-5"
        style={{ opacity: recibo * (1 - sai), transform: `translateY(${(1 - recibo) * 80}px)` }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#81F002]">Venda registrada</p>
        <p className="mt-2 text-4xl font-bold tracking-[-.03em] text-[#81F002]">R$ 1.497</p>
        <p className="mt-1 text-[12px] text-[#c9d9b8]">Mariana · Origem: Anúncio 03</p>
        <p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-white" style={{ opacity: meta }}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#81F002] text-[11px] text-black">✓</span>
          Enviada para a Meta
        </p>
      </div>

      {/* 5 · Relatório */}
      <div className="absolute inset-x-5 top-12 bottom-5 flex flex-col" style={{ opacity: rel, transform: `translateY(${(1 - rel) * 30}px)` }}>
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#9B9BA4]">Relatório do mês</p>
        <div className="mt-4 space-y-3">
          {[
            ["Investimento", "R$ 3.000", 1],
            ["Conversas", "280", 0.82],
            ["Vendas", "12", 0.5],
            ["Faturamento", "R$ 18.400", 0.68],
          ].map(([nome, valor, largura], i) => (
            <div key={nome as string}>
              <div className="flex justify-between text-[12px]"><span className="text-[#9B9BA4]">{nome}</span><b className={i === 3 ? "text-[#81F002]" : ""}>{valor}</b></div>
              <div className="mt-1.5 h-2.5 rounded-full bg-white/5">
                <div className={`h-full rounded-full ${i === 3 ? "bg-[#81F002]" : "bg-[#F2551F]"}`} style={{ width: `${(largura as number) * barras[i] * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-2xl border-2 border-[#F2551F] bg-[#F2551F]/10 p-4" style={{ opacity: seg(p, 0.94, 0.98) }}>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#F2551F]">Gargalo do mês</p>
          <p className="mt-1 text-[14px] font-semibold">Agendamento → comparecimento</p>
        </div>
      </div>

      <p className="absolute bottom-1.5 inset-x-0 text-center text-[9px] text-[#63636C]">exemplo ilustrativo</p>
    </div>
  );
}

export default function MetodoScroll({ etapas }: { etapas: Etapa[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const p = useProgresso(ref);
  const ativa = Math.min(etapas.length - 1, Math.floor(p * etapas.length));
  const e = etapas[ativa];

  return (
    <>
      {/* Versão animada */}
      <div ref={ref} className="relative h-[560vh] motion-reduce:hidden">
        <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden pt-16 lg:pt-0">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-5 md:px-6 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div className="order-2 lg:order-1">
              <div className="flex gap-2">
                {etapas.map((x, i) => (
                  <span key={x.n} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= ativa ? (x.verde && i === ativa ? "bg-[#81F002]" : "bg-[#F2551F]") : "bg-white/10"}`} />
                ))}
              </div>
              <div key={e.n} className="animate-[metodoEntra_.45s_ease-out]">
                <p className={`mt-6 text-6xl font-bold tracking-[-.04em] lg:mt-10 lg:text-8xl ${e.verde ? "text-[#81F002]" : "text-[#F2551F]"}`}>{e.n}</p>
                <h3 className={`mt-2 text-3xl font-bold tracking-[-.03em] lg:text-5xl ${e.verde ? "text-[#81F002]" : ""}`}>{e.nome}</h3>
                <p className="mt-3 max-w-md text-base leading-7 text-[#B4B4BC] lg:mt-5 lg:text-xl lg:leading-8">{e.texto}</p>
                <p className="mt-4 w-fit rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-[#9B9BA4] lg:mt-6">{e.onde}</p>
              </div>
              <ol className="mt-10 hidden gap-5 text-sm lg:flex">
                {etapas.map((x, i) => (
                  <li key={x.n} className={i === ativa ? "font-bold text-white" : "text-[#63636C]"}>{x.nome}</li>
                ))}
              </ol>
            </div>
            <div className="order-1 origin-top scale-[.82] sm:scale-100 lg:order-2">
              <Palco p={p} />
            </div>
          </div>
        </div>
      </div>

      {/* Versão estática (reduzir movimento) */}
      <div className="mx-auto hidden max-w-7xl px-5 pb-20 motion-reduce:block md:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {etapas.map((x) => (
            <article key={x.n} className={`flex flex-col rounded-3xl border p-7 ${x.verde ? "border-[#81F002]/60 bg-[#81F002]/[.05]" : "border-white/10 bg-[#17171D]"}`}>
              <span className={`text-5xl font-bold tracking-[-.04em] ${x.verde ? "text-[#81F002]" : "text-[#F2551F]"}`}>{x.n}</span>
              <h3 className={`mt-6 text-2xl font-bold ${x.verde ? "text-[#81F002]" : ""}`}>{x.nome}</h3>
              <p className="mt-3 flex-1 leading-7 text-[#9B9BA4]">{x.texto}</p>
              <p className="mt-6 w-fit rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-[#9B9BA4]">{x.onde}</p>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
