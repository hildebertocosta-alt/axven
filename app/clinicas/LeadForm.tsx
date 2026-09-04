"use client";

import { FormEvent, useEffect, useState } from "react";

type ResultState = null | "qualified" | "unqualified" | "error";

const trackingKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "campaign_id",
  "adset_id",
  "ad_id",
] as const;

export default function LeadForm() {
  const [sent, setSent] = useState<ResultState>(null);
  const [sending, setSending] = useState(false);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const captured: Record<string, string> = {};
    trackingKeys.forEach((key) => {
      const value = params.get(key);
      if (value) captured[key] = value;
    });
    setTracking(captured);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setSent(null);

    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());

    try {
      const response = await fetch("/api/aquisicao/clinicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...tracking,
          origin_url: window.location.href,
        }),
      });

      if (!response.ok) throw new Error("request_failed");
      const result = await response.json();
      setSent(result.qualified ? "qualified" : "unqualified");
    } catch {
      setSent("error");
    } finally {
      setSending(false);
    }
  }

  if (sent === "qualified") {
    return <Result title="Sua clínica tem perfil para avançar." text="Com base nas informações enviadas, o próximo passo é uma Análise de Crescimento Axven. O calendário será conectado aqui na etapa de agenda." />;
  }

  if (sent === "unqualified") {
    return <Result title="Obrigado pelo interesse na Axven." text="Neste momento, nossa Estrutura de Crescimento foi desenhada para operações em uma fase específica de maturidade. Suas informações poderão ser consideradas futuramente para uma solução mais adequada." />;
  }

  return (
    <>
      {sent === "error" && (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-200">
          Não foi possível enviar agora. Tente novamente em instantes.
        </div>
      )}
      <form onSubmit={submit} className="mt-10 space-y-5 rounded-3xl border border-[#2A2A32] bg-[#0B0B0F] p-6 md:p-8">
        <Field label="Seu nome"><input name="name" required className="input" /></Field>
        <Field label="Nome da clínica"><input name="clinic" required className="input" /></Field>
        <Field label="WhatsApp"><input name="whatsapp" required inputMode="tel" className="input" /></Field>
        <Field label="Instagram da clínica"><input name="instagram" className="input" /></Field>
        <Field label="Faturamento médio mensal"><select name="revenue" required className="input"><option value="">Selecione</option><option value="20">Até R$ 20 mil</option><option value="34">R$ 20 mil a R$ 35 mil</option><option value="60">R$ 35 mil a R$ 60 mil</option><option value="100">R$ 60 mil a R$ 100 mil</option><option value="300">R$ 100 mil a R$ 300 mil</option><option value="301">Acima de R$ 300 mil</option></select></Field>
        <Field label="Investimento atual em anúncios"><select name="ads" required className="input"><option value="">Selecione</option><option>Ainda não investimos</option><option>Até R$ 1.500</option><option>R$ 1.500 a R$ 3.000</option><option>R$ 3.000 a R$ 5.000</option><option>R$ 5.000 a R$ 10.000</option><option>Acima de R$ 10.000</option></select></Field>
        <Field label="Quem atende os leads?"><select name="sales" required className="input"><option value="">Selecione</option><option>Eu mesmo(a)</option><option>Uma pessoa responsável pelo atendimento</option><option>Temos uma equipe comercial</option><option>Não temos ninguém responsável</option></select></Field>
        <Field label="Principal desafio hoje"><select name="challenge" required className="input"><option value="">Selecione</option><option>Gerar mais oportunidades</option><option>Melhorar a qualidade dos leads</option><option>Transformar mais leads em agendamentos</option><option>Melhorar o comparecimento</option><option>Transformar mais agendamentos em vendas</option><option>Identificar onde perdemos oportunidades</option><option>Outro</option></select></Field>
        <Field label="Quanto a clínica está preparada para investir mensalmente em aquisição, considerando estratégia, tecnologia e mídia?"><select name="capacity" required className="input"><option value="">Selecione</option><option value="2">Até R$ 2.000</option><option value="3.9">R$ 2.000 a R$ 4.000</option><option value="6">R$ 4.000 a R$ 6.000</option><option value="10">R$ 6.000 a R$ 10.000</option><option value="11">Acima de R$ 10.000</option></select></Field>
        <Field label="Quando pretende começar?"><select name="timing" required className="input"><option value="">Selecione</option><option>Agora</option><option>Nos próximos 30 dias</option><option>Entre 1 e 3 meses</option><option>Estou apenas pesquisando</option></select></Field>
        <button disabled={sending} className="w-full rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF3D57] px-6 py-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60">{sending ? "Enviando..." : "Enviar análise →"}</button>
        <p className="text-center text-xs leading-5 text-[#63636C]">Ao enviar, você concorda com o uso das informações para análise comercial e contato da Axven.</p>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-[#F5F5F7]">{label}</span>{children}</label>;
}

function Result({ title, text }: { title: string; text: string }) {
  return <div className="mt-10 rounded-3xl border border-[#2A2A32] bg-[#0B0B0F] p-8 text-center"><div className="mx-auto mb-5 h-2 w-16 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF3D57]"/><h3 className="text-2xl font-semibold">{title}</h3><p className="mx-auto mt-4 max-w-xl leading-7 text-[#9B9BA4]">{text}</p></div>;
}
