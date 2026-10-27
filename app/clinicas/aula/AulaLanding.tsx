"use client";

import Image from "next/image";
import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import RastroScript from "@/app/components/RastroScript";
import { AULA_CLINICAS_LANDING_ID, isValidBrazilMobile } from "@/app/lib/clinicAcquisition";
import { shouldTrackMetaSubmission } from "@/app/lib/metaLeadEvent";
import { captureTracking, formatPhone, trackMeta } from "../LeadForm";
import { AULA_COMUNIDADE_URL, AULA_DATA_TEXTO, AULA_GOOGLE_AGENDA_URL, AULA_SELO } from "./config";

const META_PIXEL_ID = "3457772717706355";
const LARANJA = "#F2551F";

const topicos = [
  ["01", "Atrair quem agenda: como saber quais anúncios trazem paciente pagante."],
  ["02", "Responder e convidar: onde a paciente se perde entre a mensagem e a agenda."],
  ["03", "Acompanhar quem disse \"vou pensar\": por que a maior parte da venda não sai no primeiro contato. Tudo registrado no painel, até o caixa."],
];

type Erros = Partial<Record<"name" | "whatsapp" | "clinic", string>>;

function validar(nome: string, telefone: string, clinica: string): Erros {
  const erros: Erros = {};
  if (nome.trim().length < 2) erros.name = "Informe seu nome.";
  if (!isValidBrazilMobile(telefone.replace(/\D/g, ""))) erros.whatsapp = "Informe um celular com DDD, como (81) 99999-9999.";
  if (clinica.trim().length < 2) erros.clinic = "Informe o nome da clínica.";
  return erros;
}

export default function AulaLanding({ fontClassName }: { fontClassName: string }) {
  const [inscrito, setInscrito] = useState(false);
  const cta = "inline-flex w-full items-center justify-center rounded-xl px-7 py-4 text-base font-semibold text-white transition hover:brightness-110 sm:w-auto";
  const kicker = "text-xs font-semibold uppercase tracking-[0.2em]";

  return <>
    <Script id="meta-pixel-axven" strategy="afterInteractive">{`
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${META_PIXEL_ID}');
      fbq('track', 'PageView');
    `}</Script>
    <RastroScript />
    <noscript><img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" /></noscript>

    <main className={`${fontClassName} min-h-screen bg-black pb-24 text-[#F5F5F7] md:pb-0`}>
      <header className="mx-auto flex max-w-5xl items-center px-5 pt-5 md:px-6 md:pt-8">
        <Image src="/pasted-1788289300144-0.png" alt="Axven Digital" width={1201} height={350} priority className="h-7 w-auto md:h-8" />
      </header>

      {/* Topo: cabe na primeira tela do celular */}
      <section className="mx-auto max-w-3xl px-5 pb-14 pt-7 md:px-6 md:pb-24 md:pt-20">
        <p className="inline-flex rounded-2xl border px-3.5 py-2 text-[13px] font-medium leading-5 text-[#F5F5F7] md:text-sm" style={{ borderColor: `${LARANJA}66`, background: `${LARANJA}14` }}>
          <span className="mr-2 mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: LARANJA }} aria-hidden />
          {AULA_SELO}
        </p>
        <h1 className="mt-5 text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:mt-7 md:text-6xl">Como saber quais anúncios viram <span style={{ color: LARANJA }}>paciente pagante</span> na sua clínica</h1>
        <p className="mt-4 text-base leading-7 text-[#A4A4AD] md:mt-6 md:text-lg md:leading-8">O Hildeberto mostra ao vivo o <strong className="font-semibold text-[#F5F5F7]">Método Rastro</strong>, o processo que a Axven usa com clínicas de estética: do anúncio ao atendimento no WhatsApp e ao acompanhamento de quem ainda não agendou.</p>
        <a href="#inscricao" className={`${cta} mt-6 md:mt-8`} style={{ background: LARANJA }}>Quero participar</a>
      </section>

      {/* O que você vai ver */}
      <section className="border-t border-[#1F1F24]">
        <div className="mx-auto max-w-3xl px-5 py-14 md:px-6 md:py-20">
          <p className={kicker} style={{ color: LARANJA }}>Método Rastro em 3 etapas</p>
          <ul className="mt-6 space-y-3">
            {topicos.map(([n, t]) => <li key={n} className="flex gap-4 rounded-2xl border border-[#1F1F24] bg-[#0E0E12] p-5">
              <span className="text-sm font-semibold" style={{ color: LARANJA }}>{n}</span>
              <span className="text-[17px] leading-7">{t}</span>
            </li>)}
          </ul>
        </div>
      </section>

      {/* Prova: dado medido, não promessa */}
      <section className="border-t border-[#1F1F24]">
        <div className="mx-auto max-w-3xl px-5 py-14 md:px-6 md:py-20">
          <p className={kicker} style={{ color: LARANJA }}>Quem já usa o processo</p>
          <figure className="mt-6 rounded-3xl border border-[#1F1F24] bg-[#0E0E12] p-6 md:p-8">
            <p className="text-lg leading-8 md:text-xl md:leading-9">Uma rede de clínicas com 11 unidades no Nordeste usa esse processo. Nela, <strong className="font-semibold" style={{ color: LARANJA }}>42% das compras</strong> vieram de quem tinha chamado havia mais de 30 dias.</p>
            <figcaption className="mt-5 text-xs leading-5 text-[#77777F]">Dados de um cliente da Axven, sem o nome. Não é promessa de resultado.</figcaption>
          </figure>
        </div>
      </section>

      {/* Quem apresenta */}
      <section className="border-t border-[#1F1F24]">
        <div className="mx-auto flex max-w-3xl items-center gap-5 px-5 py-14 md:gap-8 md:px-6 md:py-20">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[#2A2A32] bg-[#111117] md:h-32 md:w-32">
            <Image src="/clinicas/aula-hildeberto.jpg" alt="Hildeberto Costa, fundador da Axven Digital" fill sizes="128px" className="object-cover" />
          </div>
          <div>
            <p className={kicker} style={{ color: LARANJA }}>Quem apresenta</p>
            <p className="mt-2 text-xl font-semibold">Hildeberto Costa</p>
            <p className="mt-1 text-[15px] leading-6 text-[#A4A4AD]">Fundador da Axven Digital. Monta com clínicas de estética a estrutura que liga o anúncio ao atendimento no WhatsApp e à venda registrada.</p>
          </div>
        </div>
      </section>

      {/* Inscrição */}
      <section id="inscricao" className="scroll-mt-4 border-t border-[#1F1F24] bg-[#08080A]">
        <div className="mx-auto max-w-xl px-5 py-14 md:px-6 md:py-20">
          <Inscricao onInscrito={() => setInscrito(true)} />
        </div>
      </section>

      <footer className="border-t border-[#1F1F24] px-5 py-8 text-center text-xs text-[#5E5E66]">
        Axven Digital · <a href="/politica-de-privacidade" className="underline underline-offset-2">Política de privacidade</a>
      </footer>

      {/* Barra fixa no celular */}
      {!inscrito && <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#1F1F24] bg-black/95 p-3 backdrop-blur md:hidden">
        <a href="#inscricao" className="block w-full rounded-xl px-4 py-3.5 text-center text-[15px] font-semibold text-white" style={{ background: LARANJA }}>Garantir minha vaga</a>
      </div>}

      <style jsx global>{`html{scroll-behavior:smooth}.aula-input{width:100%;border:1px solid #2A2A32;background:#111117;color:#F5F5F7;border-radius:12px;padding:14px 16px;font-size:16px;outline:none}.aula-input:focus{border-color:${LARANJA}}.aula-input[aria-invalid=true]{border-color:#F87171}`}</style>
    </main>
  </>;
}

function Inscricao({ onInscrito }: { onInscrito: () => void }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [clinica, setClinica] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [pronto, setPronto] = useState(false);
  const submissionId = useRef<string | null>(null);
  const confirmacao = useRef<HTMLDivElement>(null);

  useEffect(() => { if (pronto) confirmacao.current?.scrollIntoView({ block: "start" }); }, [pronto]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;
    const encontrados = validar(nome, telefone, clinica);
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;
    submissionId.current ??= crypto.randomUUID();
    setEnviando(true);
    setFalhou(false);
    try {
      const resposta = await fetch("/api/aquisicao/clinicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landing: AULA_CLINICAS_LANDING_ID, name: nome.trim(), whatsapp: telefone, clinic: clinica.trim(), submission_id: submissionId.current, ...captureTracking(), origin_url: window.location.href }),
      });
      if (!resposta.ok) throw new Error();
      const resultado = await resposta.json();
      if (shouldTrackMetaSubmission(resultado)) trackMeta("Lead", { content_name: "Aula ao vivo clinicas", vertical: "clinicas_estetica" }, false, resultado.meta_event_id);
      setPronto(true);
      onInscrito();
    } catch {
      setFalhou(true);
    } finally {
      setEnviando(false);
    }
  }

  if (pronto) return <div ref={confirmacao} className="scroll-mt-6 text-center" data-testid="aula-proximo-passo">
    <div className="mx-auto mb-6 h-1.5 w-14 rounded-full" style={{ background: LARANJA }} />
    <p className="text-sm text-[#A4A4AD]">Inscrição feita.</p>
    <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">Falta 1 passo: entre na comunidade da aula</h2>
    <p className="mx-auto mt-4 max-w-md leading-7 text-[#A4A4AD]">É por lá que vão o link da aula e os avisos. {AULA_DATA_TEXTO}.</p>
    {AULA_COMUNIDADE_URL
      ? <a href={AULA_COMUNIDADE_URL} target="_blank" rel="noopener noreferrer" className="mt-8 flex w-full items-center justify-center rounded-xl px-6 py-5 text-lg font-semibold text-white transition hover:brightness-110" style={{ background: LARANJA }}>Entrar na comunidade do WhatsApp</a>
      : <p className="mt-8 rounded-2xl border border-[#2A2A32] bg-[#111117] px-5 py-5 text-base leading-7">Você vai receber o link da comunidade no seu WhatsApp.</p>}
    <a href={AULA_GOOGLE_AGENDA_URL} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#2A2A32] px-6 py-4 font-semibold hover:border-[#4A4A55]">Salvar na agenda</a>
  </div>;

  return <>
    <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">Garanta sua vaga</h2>
    <p className="mt-3 text-center leading-7 text-[#A4A4AD]">{AULA_DATA_TEXTO} · online e gratuita.</p>
    {falhou && <div role="alert" className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-200">Não foi possível enviar agora. Tente de novo em instantes.</div>}
    <form onSubmit={enviar} noValidate className="mt-8 space-y-5" aria-label="Inscrição na aula">
      <Campo id="aula-nome" label="Seu nome" erro={erros.name}>
        <input id="aula-nome" name="name" autoComplete="name" value={nome} onChange={e => setNome(e.target.value)} aria-invalid={!!erros.name} aria-describedby={erros.name ? "aula-nome-erro" : undefined} className="aula-input" />
      </Campo>
      <Campo id="aula-whatsapp" label="Seu WhatsApp" erro={erros.whatsapp}>
        <input id="aula-whatsapp" name="whatsapp" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="(81) 99999-9999" maxLength={15} value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} aria-invalid={!!erros.whatsapp} aria-describedby={erros.whatsapp ? "aula-whatsapp-erro" : undefined} className="aula-input" />
      </Campo>
      <Campo id="aula-clinica" label="Nome da clínica" erro={erros.clinic}>
        <input id="aula-clinica" name="clinic" autoComplete="organization" value={clinica} onChange={e => setClinica(e.target.value)} aria-invalid={!!erros.clinic} aria-describedby={erros.clinic ? "aula-clinica-erro" : undefined} className="aula-input" />
      </Campo>
      <button type="submit" disabled={enviando} className="w-full rounded-xl px-6 py-4 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60" style={{ background: LARANJA }}>{enviando ? "Enviando..." : "Garantir minha vaga"}</button>
      <p className="text-center text-xs leading-5 text-[#77777F]">Ao se inscrever, você aceita receber no WhatsApp as mensagens sobre a aula. Você pode sair quando quiser.</p>
    </form>
  </>;
}

function Campo({ id, label, erro, children }: { id: string; label: string; erro?: string; children: React.ReactNode }) {
  return <div>
    <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
    {children}
    {erro && <p id={`${id}-erro`} className="mt-1.5 text-sm text-red-300">{erro}</p>}
  </div>;
}
