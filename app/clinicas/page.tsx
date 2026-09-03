"use client";

import { FormEvent, useState } from "react";

const steps = [
  ["01", "Atração", "Estratégia, campanhas e criativos para gerar novas oportunidades para sua clínica."],
  ["02", "Lead", "Os novos contatos entram em uma jornada estruturada, com origem e contexto preservados."],
  ["03", "Qualificação", "Organizamos as oportunidades para facilitar a priorização comercial."],
  ["04", "Agendamento", "Acompanhamos a evolução do lead até o agendamento e os próximos passos."],
  ["05", "CRM", "Cada oportunidade passa a ter estágio e histórico dentro do processo comercial."],
  ["06", "Venda + Dados", "Resultados comerciais alimentam a leitura de performance e as próximas decisões."],
];

const fit = [
  "Fatura a partir de R$ 35 mil por mês",
  "Já possui procedimentos e ofertas validados",
  "Já vende e possui uma operação em funcionamento",
  "Possui alguém responsável pelo atendimento dos leads",
  "Tem capacidade para receber novos pacientes",
  "Está disposta a acompanhar agendamentos e vendas",
];

export default function ClinicasPage() {
  const [sent, setSent] = useState<null | "qualified" | "unqualified">(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const revenue = Number(data.get("revenue") || 0);
    const capacity = Number(data.get("capacity") || 0);
    setSent(revenue >= 35 && capacity >= 4 ? "qualified" : "unqualified");
  }

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F5F5F7]">
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <div className="mb-8 inline-flex rounded-full border border-[#2A2A32] bg-[#111117] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6B35]">Para clínicas de estética com operação validada</div>
        <h1 className="max-w-5xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-7xl">Transforme seu marketing em uma <span className="bg-gradient-to-r from-[#FF6B35] to-[#FF3D57] bg-clip-text text-transparent">estrutura de aquisição de pacientes.</span></h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-[#9B9BA4] md:text-xl">A Axven conecta estratégia, anúncios, atendimento e dados para sua clínica gerar novas oportunidades e acompanhar o que acontece do primeiro contato até a venda.</p>
        <a href="#analise" className="mt-9 inline-flex rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF3D57] px-7 py-4 font-semibold text-white">Quero uma análise →</a>
        <p className="mt-4 text-sm text-[#63636C]">Para clínicas com faturamento a partir de R$ 35 mil/mês.</p>
      </section>

      <section className="border-y border-[#2A2A32] bg-[#111117]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF6B35]">O gargalo</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">O problema pode não estar apenas nos seus anúncios.</h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#9B9BA4]">Contatos chegam, alguns agendam, outros somem, alguns comparecem e outros compram. No final do mês, sua clínica consegue identificar quais campanhas trouxeram as melhores oportunidades, quantas agendaram e quanto virou venda?</p>
          <div className="mt-10 grid gap-3 md:grid-cols-2">{["Quais anúncios trouxeram as melhores oportunidades?","Quantos leads realmente agendaram?","Quantos compareceram?","Quantos compraram e quanto geraram em vendas?"].map((x)=><div key={x} className="rounded-2xl border border-[#2A2A32] bg-[#17171D] p-5 text-[#F5F5F7]">{x}</div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF6B35]">Estrutura de Crescimento Axven</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Do anúncio ao procedimento vendido.</h2>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#9B9BA4]">Marketing e comercial passam a fazer parte da mesma leitura operacional.</p>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{steps.map(([n,t,d])=><article key={n} className="rounded-2xl border border-[#2A2A32] bg-[#111117] p-6"><span className="text-sm font-semibold text-[#FF5A3C]">{n}</span><h3 className="mt-4 text-xl font-semibold">{t}</h3><p className="mt-3 leading-7 text-[#9B9BA4]">{d}</p></article>)}</div>
        <div className="mt-8 rounded-2xl border border-[#2A2A32] p-6 text-center text-sm text-[#9B9BA4] md:text-base">Anúncio → Lead → Qualificação → Agendamento → Venda → Receita → Dados</div>
      </section>

      <section className="bg-[#111117]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF6B35]">Perfil ideal</p><h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">A Axven não é para toda clínica.</h2><p className="mt-6 leading-8 text-[#9B9BA4]">Foi desenhada para operações que já provaram que conseguem vender e agora querem estruturar aquisição, processo comercial e dados.</p></div>
          <div className="space-y-3">{fit.map((x)=><div key={x} className="rounded-xl border border-[#2A2A32] bg-[#17171D] p-4"><span className="mr-3 text-[#FF6B35]">✓</span>{x}</div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF6B35]">O que construímos</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Uma operação conectada, não apenas campanhas.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">{[
          ["Estratégia de aquisição","Campanhas, ofertas e jornadas para geração de demanda."],
          ["Gestão de mídia","Estruturação, operação e otimização das campanhas."],
          ["Criativos de performance","Estratégia, copy, roteiros, design e adaptação dos materiais usados nas campanhas."],
          ["CRM e processo comercial","Organização da jornada entre lead, qualificação, agendamento e venda."],
          ["Tracking e dados","Estrutura para conectar origem, oportunidade e resultado comercial."],
          ["Automações essenciais","Automatizações necessárias dentro do processo padronizado da Axven."],
        ].map(([t,d])=><div key={t} className="rounded-2xl border border-[#2A2A32] bg-[#111117] p-6"><h3 className="text-xl font-semibold">{t}</h3><p className="mt-3 leading-7 text-[#9B9BA4]">{d}</p></div>)}</div>
      </section>

      <section id="analise" className="border-t border-[#2A2A32] bg-[#111117]">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-[#FF6B35]">Análise de Crescimento Axven</p>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight md:text-5xl">Sua clínica tem perfil para avançar?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-center leading-8 text-[#9B9BA4]">Responda algumas perguntas rápidas. Se houver alinhamento com a estrutura atual da Axven, você poderá avançar para o agendamento da análise.</p>

          {!sent && <form onSubmit={submit} className="mt-10 space-y-5 rounded-3xl border border-[#2A2A32] bg-[#0B0B0F] p-6 md:p-8">
            <Field label="Seu nome"><input name="name" required className="input" /></Field>
            <Field label="Nome da clínica"><input name="clinic" required className="input" /></Field>
            <Field label="WhatsApp"><input name="whatsapp" required className="input" /></Field>
            <Field label="Instagram da clínica"><input name="instagram" className="input" /></Field>
            <Field label="Faturamento médio mensal"><select name="revenue" required className="input"><option value="">Selecione</option><option value="20">Até R$ 20 mil</option><option value="34">R$ 20 mil a R$ 35 mil</option><option value="60">R$ 35 mil a R$ 60 mil</option><option value="100">R$ 60 mil a R$ 100 mil</option><option value="300">R$ 100 mil a R$ 300 mil</option><option value="301">Acima de R$ 300 mil</option></select></Field>
            <Field label="Investimento atual em anúncios"><select name="ads" required className="input"><option value="">Selecione</option><option>Ainda não investimos</option><option>Até R$ 1.500</option><option>R$ 1.500 a R$ 3.000</option><option>R$ 3.000 a R$ 5.000</option><option>R$ 5.000 a R$ 10.000</option><option>Acima de R$ 10.000</option></select></Field>
            <Field label="Quem atende os leads?"><select name="sales" required className="input"><option value="">Selecione</option><option>Eu mesmo(a)</option><option>Uma pessoa responsável pelo atendimento</option><option>Temos uma equipe comercial</option><option>Não temos ninguém responsável</option></select></Field>
            <Field label="Principal desafio hoje"><select name="challenge" required className="input"><option value="">Selecione</option><option>Gerar mais oportunidades</option><option>Melhorar a qualidade dos leads</option><option>Transformar mais leads em agendamentos</option><option>Melhorar o comparecimento</option><option>Transformar mais agendamentos em vendas</option><option>Identificar onde perdemos oportunidades</option><option>Outro</option></select></Field>
            <Field label="Quanto a clínica está preparada para investir mensalmente em aquisição, considerando estratégia, tecnologia e mídia?"><select name="capacity" required className="input"><option value="">Selecione</option><option value="2">Até R$ 2.000</option><option value="3.9">R$ 2.000 a R$ 4.000</option><option value="6">R$ 4.000 a R$ 6.000</option><option value="10">R$ 6.000 a R$ 10.000</option><option value="11">Acima de R$ 10.000</option></select></Field>
            <Field label="Quando pretende começar?"><select name="timing" required className="input"><option value="">Selecione</option><option>Agora</option><option>Nos próximos 30 dias</option><option>Entre 1 e 3 meses</option><option>Estou apenas pesquisando</option></select></Field>
            <button className="w-full rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF3D57] px-6 py-4 font-semibold text-white">Enviar análise →</button>
            <p className="text-center text-xs leading-5 text-[#63636C]">Ao enviar, você concorda com o uso das informações para análise comercial e contato da Axven.</p>
          </form>}

          {sent === "qualified" && <Result title="Sua clínica tem perfil para avançar." text="Com base nas informações enviadas, o próximo passo é uma Análise de Crescimento Axven. O calendário será conectado aqui na etapa de agenda." />}
          {sent === "unqualified" && <Result title="Obrigado pelo interesse na Axven." text="Neste momento, nossa Estrutura de Crescimento foi desenhada para operações em uma fase específica de maturidade. Suas informações poderão ser consideradas futuramente para uma solução mais adequada." />}
        </div>
      </section>
      <style jsx global>{`.input{width:100%;border:1px solid #2A2A32;background:#17171D;color:#F5F5F7;border-radius:12px;padding:14px 16px;outline:none}.input:focus{border-color:#FF5A3C}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-[#F5F5F7]">{label}</span>{children}</label>;
}

function Result({ title, text }: { title: string; text: string }) {
  return <div className="mt-10 rounded-3xl border border-[#2A2A32] bg-[#0B0B0F] p-8 text-center"><div className="mx-auto mb-5 h-2 w-16 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF3D57]"/><h3 className="text-2xl font-semibold">{title}</h3><p className="mx-auto mt-4 max-w-xl leading-7 text-[#9B9BA4]">{text}</p></div>;
}
