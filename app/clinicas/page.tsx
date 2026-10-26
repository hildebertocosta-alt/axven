"use client";

import Script from "next/script";
import LeadForm, { onWhatsappClick, WHATSAPP_HREF } from "./LeadForm";
import RastroScript from "@/app/components/RastroScript";

const META_PIXEL_ID = "3457772717706355";

// Case real, anônimo (OBELE). Fonte: Painel OBELE, setembro de 2026.
// Contatos e qualificados contam pelo mês do primeiro contato; vendas e valor, pelo mês da compra.
const caseNumbers = [
  ["923", "contatos vindos de anúncio"],
  ["51", "contatos qualificados pelo atendimento"],
  ["21", "vendas ligadas ao anúncio de origem"],
  ["R$ 41 mil", "em vendas registradas"],
];

const steps = [
  ["01", "Anúncios que buscam paciente", "Campanhas no Instagram e no Facebook, ajustadas toda semana. A gente diz o que gravar e testa o que funciona."],
  ["02", "Cada conversa com a origem", "O contato chega no WhatsApp da clínica já marcado com o anúncio que trouxe. Sua equipe marca o agendamento e a venda num painel simples."],
  ["03", "Verba decidida pela venda", "Todo mês você vê quanto cada anúncio vendeu e quanto custou cada paciente. A verba vai para o que vende, não para o que dá clique."],
];

const included = [
  "Gestão dos anúncios no Instagram e no Facebook",
  "Roteiros de criativos para a sua equipe gravar",
  "Painel Axven com o funil do contato à venda",
  "Vendas devolvidas ao Meta para os anúncios buscarem quem compra",
  "Relatório mensal com vendas, receita e custo por paciente",
  "Toda segunda, a imagem dos anúncios da semana no seu WhatsApp",
];

const questions = [
  ["Em quanto tempo fica pronto?", "Em até 15 dias úteis o painel está no ar mostrando de qual anúncio veio cada contato. Se não estiver, a mensalidade seguinte é por nossa conta."],
  ["Tenho que ficar preso num contrato longo?", "O contrato é de 6 meses, com saída livre no 3º mês: se o relatório não mostrar de onde vêm as vendas registradas, você sai sem multa."],
  ["O que a minha clínica precisa ter?", "Alguém que atenda o WhatsApp e marque no painel quem agendou e quem comprou. É isso que liga o anúncio à venda."],
  ["Vocês gravam e editam os vídeos?", "Não. A gente define o que gravar e escreve o roteiro; sua equipe grava e a Axven sobe nos anúncios."],
];

export default function ClinicasPage() {
  const cta = "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF3D57] px-7 py-4 font-semibold text-white shadow-[0_12px_40px_rgba(255,75,65,.18)]";
  const kicker = "text-sm font-semibold uppercase tracking-[0.18em] text-[#FF6B35]";
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
    <noscript><img height="1" width="1" style={{display:"none"}} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" /></noscript>
    <main className="min-h-screen bg-[#0B0B0F] pb-24 text-[#F5F5F7] md:pb-0">

    {/* Topo */}
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_.9fr]">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-[#34343D] bg-[#111117]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6B35]">Para clínicas de estética</div>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-6xl">Saiba quais anúncios viram <span className="bg-gradient-to-r from-[#FF6B35] to-[#FF3D57] bg-clip-text text-transparent">paciente pagante</span> e coloque mais verba neles.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#A4A4AD]">A Axven cuida dos anúncios da sua clínica e liga cada conversa do WhatsApp à venda. No fim do mês, você vê quanto cada real investido voltou.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#analise" className={cta}>Quero uma análise da minha clínica →</a>
            <a href={WHATSAPP_HREF} onClick={onWhatsappClick} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2A32] px-6 py-4 font-semibold hover:border-[#25D366]"><span className="text-[#25D366]">●</span> Falar no WhatsApp</a>
          </div>
          <p className="mt-5 text-sm leading-6 text-[#8A8A94]">Numa rede de depilação a laser com 11 unidades, ligamos <strong className="text-[#F5F5F7]">21 vendas</strong> ao anúncio de origem em um único mês.</p>
        </div>

        {/* Prova: números reais do painel (cliente anônimo) */}
        <div className="rounded-[28px] border border-[#2A2A32] bg-[#111117] p-6 shadow-2xl md:p-8">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF8A64]">Painel Axven · setembro de 2026</p><span className="rounded-full bg-[#70D99A]/10 px-3 py-1 text-[11px] font-semibold text-[#70D99A]">dado real</span></div>
          <p className="mt-2 text-sm text-[#9B9BA4]">Rede de depilação a laser · 11 unidades no Nordeste</p>
          <div className="mt-6 grid grid-cols-2 gap-3">{caseNumbers.map(([n,t])=><div key={t} className="rounded-2xl border border-[#2A2A32] bg-[#0B0B0F] p-4"><p className="text-2xl font-semibold tracking-tight md:text-3xl">{n}</p><p className="mt-1 text-xs leading-5 text-[#9B9BA4]">{t}</p></div>)}</div>
          <div className="mt-5 space-y-2 text-sm">{[["Anúncio","Contato no WhatsApp"],["Atendimento","Agendamento"],["Venda","Valor no painel"]].map(([a,b])=><div key={a} className="flex items-center justify-between rounded-xl bg-[#17171D] px-4 py-3"><span>{a}</span><span className="text-[#FF6B35]">→</span><span className="text-[#C8C8CE]">{b}</span></div>)}</div>
          <p className="mt-4 text-[11px] leading-5 text-[#686872]">Números do painel do cliente. O valor foi registrado em 19 das 21 vendas. Resultado de outra clínica depende da oferta, da verba e do atendimento.</p>
        </div>
      </div>
    </section>

    {/* Problema */}
    <section className="border-y border-[#2A2A32] bg-[#111117]"><div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <p className={kicker}>O problema</p>
      <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">A clínica sabe quantas mensagens chegaram. Mas quantas viraram dinheiro?</h2>
      <div className="mt-8 grid gap-3 md:grid-cols-2">{["Quais anúncios trouxeram paciente que pagou?","Quantos contatos realmente agendaram?","Quantos compareceram?","Quanto entrou no caixa por causa dos anúncios?"].map(x=><div key={x} className="rounded-2xl border border-[#2A2A32] bg-[#17171D] p-5">{x}</div>)}</div>
      <a href="#analise" className={`${cta} mt-8`}>Quero essas respostas da minha clínica →</a>
    </div></section>

    {/* Como funciona */}
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <p className={kicker}>Como funciona</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Do anúncio ao procedimento vendido, em 3 passos.</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">{steps.map(([n,t,d])=><article key={n} className="rounded-2xl border border-[#2A2A32] bg-[#111117] p-6"><span className="text-sm font-semibold text-[#FF5A3C]">{n}</span><h3 className="mt-3 text-lg font-semibold">{t}</h3><p className="mt-2 text-sm leading-6 text-[#9B9BA4]">{d}</p></article>)}</div>
    </section>

    {/* Oferta */}
    <section className="bg-[#111117]"><div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
      <div>
        <p className={kicker}>O que vem incluído</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Estrutura Axven</h2>
        <ul className="mt-8 space-y-3">{included.map(x=><li key={x} className="flex gap-3 rounded-xl border border-[#2A2A32] bg-[#17171D] p-4"><span className="text-[#FF6B35]">✓</span><span>{x}</span></li>)}</ul>
      </div>
      <div className="self-center rounded-[28px] border border-[#FF6B35]/40 bg-[#0B0B0F] p-8">
        <p className="text-sm text-[#9B9BA4]">A partir de</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">R$ 990<span className="text-lg font-medium text-[#9B9BA4]">/mês</span></p>
        <p className="mt-3 text-sm leading-6 text-[#9B9BA4]">Para verba de anúncio de até R$ 3 mil por mês. Verba maior ou mais de uma unidade: valor na conversa.</p>
        <div className="mt-6 rounded-2xl bg-[#FF6B35]/10 p-4 text-sm leading-6 text-[#FFD0BF]"><strong className="text-white">Condição de fundador até 30/11:</strong> preço travado por 12 meses.</div>
        <ul className="mt-6 space-y-2 text-sm text-[#C8C8CE]"><li>✓ Painel no ar em até 15 dias úteis</li><li>✓ Saída livre no 3º mês</li><li>✓ Teste do atendimento da sua clínica, de bônus</li></ul>
        <a href="#analise" className={`${cta} mt-8 w-full`}>Quero uma análise →</a>
      </div>
    </div></section>

    {/* Perguntas */}
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <p className={kicker}>Perguntas rápidas</p>
      <div className="mt-6 space-y-3">{questions.map(([q,a])=><details key={q} className="group rounded-2xl border border-[#2A2A32] bg-[#111117] p-5"><summary className="cursor-pointer list-none font-semibold">{q}<span className="float-right text-[#FF6B35] group-open:rotate-45">+</span></summary><p className="mt-3 leading-7 text-[#9B9BA4]">{a}</p></details>)}</div>
      <p className="mt-8 text-sm leading-6 text-[#8A8A94]">Quem atende é o Hildeberto Costa, fundador da Axven Digital, gestor de tráfego de clínicas, restaurantes, lojas e revendas no Nordeste.</p>
    </section>

    {/* Formulário */}
    <section id="analise" className="border-t border-[#2A2A32] bg-[#111117]"><div className="mx-auto max-w-xl px-6 py-16 md:py-24">
      <p className={`${kicker} text-center`}>Análise gratuita</p>
      <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight md:text-5xl">Vamos olhar os anúncios da sua clínica.</h2>
      <p className="mx-auto mt-5 max-w-lg text-center leading-7 text-[#9B9BA4]">Preencha 4 campos e escolha um horário. Na conversa, mostramos onde a clínica está perdendo paciente entre o anúncio e a venda.</p>
      <LeadForm />
    </div></section>

    {/* Botão fixo no celular */}
    <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-[#2A2A32] bg-[#0B0B0F]/95 p-3 backdrop-blur md:hidden">
      <a href="#analise" className="flex-1 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF3D57] px-4 py-3 text-center text-sm font-semibold text-white">Quero uma análise</a>
      <a href={WHATSAPP_HREF} onClick={onWhatsappClick} target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp" className="rounded-xl border border-[#2A2A32] px-4 py-3 text-sm font-semibold"><span className="text-[#25D366]">●</span> WhatsApp</a>
    </div>

    <style jsx global>{`.input{width:100%;border:1px solid #2A2A32;background:#17171D;color:#F5F5F7;border-radius:12px;padding:14px 16px;outline:none}.input:focus{border-color:#FF5A3C}html{scroll-behavior:smooth}`}</style>
  </main>
  </>;
}
