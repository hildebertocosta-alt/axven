import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { ordenarEtapas, type EtapaCliente } from "@/app/lib/leadEtapas";
import {
  funil,
  rankingAnuncios,
  resolverPeriodo,
  resumoResultado,
  semLeadsDeTeste,
  type GastoAnuncio,
  type LeadResultado,
} from "@/app/lib/portalResultado";
import { LogoutButton } from "../LogoutButton";
import { PortalTabs } from "../PortalTabs";
import { portalSidebarItems } from "../portalNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
};

const moeda = (valor: number | null) =>
  valor === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valor);
const inteiro = (valor: number) => new Intl.NumberFormat("pt-BR").format(valor);

// O Supabase devolve no máximo 1000 linhas por consulta (sem erro): lê em páginas.
const PAGINA = 1000;
async function lerTudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await consulta(de, de + PAGINA - 1);
    if (error) throw error;
    linhas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return linhas;
  }
}

function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function ResultadoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const periodo = resolverPeriodo(await searchParams, hojeEmSaoPaulo());

  const { data: cliente } = await supabaseAdmin.from("clientes").select("id, nome").eq("slug", slug).single();
  if (!cliente) notFound();

  const inicioTs = `${periodo.inicio}T00:00:00-03:00`;
  const fimTs = `${periodo.fim}T23:59:59.999-03:00`;

  type LeadBruto = { id: string; etapa: string; valor_conversao: number | null; anuncio_source_id: string | null; anuncio: string | null; plataforma: string | null };
  type GastoBruto = { ad_id: string; ad_name: string | null; spend: number | null };

  const [etapasRes, leadsTodos, gastosBrutos] = await Promise.all([
    supabaseAdmin.from("cliente_etapas").select("chave, nome, tipo, ordem").eq("cliente_id", cliente.id).eq("ativo", true),
    lerTudo<LeadBruto>((de, ate) =>
      supabaseAdmin
        .from("leads")
        .select("id, etapa, valor_conversao, anuncio_source_id, anuncio, plataforma")
        .eq("cliente_id", cliente.id)
        .gte("criado_em", inicioTs)
        .lte("criado_em", fimTs)
        .order("id")
        .range(de, ate),
    ),
    lerTudo<GastoBruto>((de, ate) =>
      supabaseAdmin
        .from("meta_ads_insights_daily")
        .select("ad_id, ad_name, spend")
        .eq("cliente_id", cliente.id)
        .gte("metric_date", periodo.inicio)
        .lte("metric_date", periodo.fim)
        .order("id")
        .range(de, ate),
    ),
  ]);
  if (etapasRes.error) throw etapasRes.error;

  const etapas = ordenarEtapas((etapasRes.data ?? []) as EtapaCliente[]);
  const chavesPerdido = new Set(etapas.filter((etapa) => etapa.tipo === "perdido").map((etapa) => etapa.chave));
  const leadsBrutos = semLeadsDeTeste(leadsTodos);

  const idsPerdidos = leadsBrutos.filter((lead) => chavesPerdido.has(lead.etapa)).map((lead) => lead.id);
  const antesDaPerda = new Map<string, string | null>();
  if (idsPerdidos.length > 0) {
    const { data: eventos, error } = await supabaseAdmin
      .from("lead_etapa_eventos")
      .select("lead_id, etapa_anterior, criado_em")
      .in("lead_id", idsPerdidos)
      .in("etapa_nova", [...chavesPerdido])
      .order("criado_em", { ascending: false });
    if (error) throw error;
    for (const evento of eventos ?? []) {
      if (!antesDaPerda.has(evento.lead_id)) antesDaPerda.set(evento.lead_id, evento.etapa_anterior);
    }
  }

  const leads: LeadResultado[] = leadsBrutos.map((lead) => ({
    etapa: lead.etapa,
    etapaAntesDaPerda: antesDaPerda.get(lead.id) ?? null,
    valor: lead.valor_conversao === null ? null : Number(lead.valor_conversao),
    anuncioId: lead.anuncio_source_id,
    anuncioNome: lead.anuncio,
  }));

  const gastoPorAnuncio = new Map<string, GastoAnuncio>();
  for (const linha of gastosBrutos) {
    const atual = gastoPorAnuncio.get(linha.ad_id) ?? { adId: linha.ad_id, adNome: linha.ad_name, gasto: 0 };
    atual.gasto += Number(linha.spend ?? 0);
    gastoPorAnuncio.set(linha.ad_id, atual);
  }
  const gastos = [...gastoPorAnuncio.values()];

  const resumo = resumoResultado(etapas, leads, gastos);
  const funilCliente = funil(etapas, leads);
  const ranking = rankingAnuncios(etapas, leads, gastos);

  const cards = [
    { rotulo: "Investimento", valor: moeda(resumo.investimento) },
    { rotulo: "Leads", valor: inteiro(resumo.leads) },
    { rotulo: "Vendas", valor: inteiro(resumo.vendas) },
    { rotulo: "Receita", valor: moeda(resumo.receita) },
    { rotulo: "Custo por venda", valor: moeda(resumo.custoPorVenda) },
    { rotulo: "Retorno (ROAS)", valor: resumo.roas === null ? "—" : `${resumo.roas.toFixed(2).replace(".", ",")}x` },
    { rotulo: "Ticket médio", valor: moeda(resumo.ticketMedio) },
  ];

  const opcoes = [
    { chave: "mes", rotulo: "Este mês", href: `/crm/${slug}/resultado` },
    { chave: "7d", rotulo: "7 dias", href: `/crm/${slug}/resultado?periodo=7d` },
    { chave: "30d", rotulo: "30 dias", href: `/crm/${slug}/resultado?periodo=30d` },
  ];

  return (
    <AppShell
      title={cliente.nome}
      subtitle="Resultado"
      activeLabel="Resultado"
      actions={<LogoutButton />}
      variant="portal"
      sidebarItems={portalSidebarItems(slug)}
    >
      <PortalTabs slug={slug} active="resultado" />

      <div className="mb-5 flex flex-wrap items-end gap-2">
        {opcoes.map((opcao) => (
          <Link
            key={opcao.chave}
            href={opcao.href}
            className={`rounded-full px-4 py-2 text-sm font-medium ${periodo.chave === opcao.chave ? "bg-white text-zinc-950" : "border border-white/10 text-zinc-300"}`}
          >
            {opcao.rotulo}
          </Link>
        ))}
        <form className="flex flex-wrap items-end gap-2" action={`/crm/${slug}/resultado`}>
          <input type="hidden" name="periodo" value="personalizado" />
          <label className="text-xs text-zinc-400">
            De
            <input type="date" name="inicio" defaultValue={periodo.inicio} className="ml-1 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm text-white" />
          </label>
          <label className="text-xs text-zinc-400">
            até
            <input type="date" name="fim" defaultValue={periodo.fim} className="ml-1 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm text-white" />
          </label>
          <button type="submit" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-200">Ver</button>
        </form>
      </div>

      <p className="mb-4 text-sm text-zinc-400">
        {periodo.rotulo}: números dos leads que chegaram no período, com a etapa em que cada um está hoje.
      </p>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => (
          <div key={card.rotulo} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <p className="text-xs text-zinc-400">{card.rotulo}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.valor}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">Funil</h2>
        {funilCliente.gargalo ? (
          <p className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            ⚠️ <strong>{funilCliente.gargalo.perdaPct}%</strong> dos seus leads param em <strong>{funilCliente.gargalo.nome}</strong>. É aqui que vale focar.
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Ainda não há leads suficientes para apontar um gargalo.</p>
        )}
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {funilCliente.etapas.map((etapa) => (
            <li
              key={etapa.chave}
              className={`rounded-xl border p-4 ${funilCliente.gargalo?.chave === etapa.chave ? "border-amber-400/50 bg-amber-400/5" : "border-white/10"}`}
            >
              <p className="text-sm text-zinc-300">{etapa.nome}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{inteiro(etapa.alcancaram)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {etapa.passagem === null ? "Entrada do funil" : `${Math.round(etapa.passagem * 100)}% passaram da etapa anterior`}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">Anúncios que mais vendem</h2>
        {ranking.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Nenhum anúncio com dados no período.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-zinc-400">
                <tr>
                  <th className="py-2 pr-3 font-medium">Anúncio</th>
                  <th className="py-2 pr-3 font-medium">Receita</th>
                  <th className="py-2 pr-3 font-medium">Vendas</th>
                  <th className="py-2 pr-3 font-medium">Leads</th>
                  <th className="py-2 pr-3 font-medium">Investimento</th>
                  <th className="py-2 font-medium">Custo por venda</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((linha) => (
                  <tr key={linha.chave} className="border-t border-white/5 text-zinc-200">
                    <td className="max-w-[260px] truncate py-2 pr-3">{linha.nome}</td>
                    <td className="py-2 pr-3">{moeda(linha.receita)}</td>
                    <td className="py-2 pr-3">{inteiro(linha.vendas)}</td>
                    <td className="py-2 pr-3">{inteiro(linha.leads)}</td>
                    <td className="py-2 pr-3">{moeda(linha.investimento)}</td>
                    <td className="py-2">{moeda(linha.custoPorVenda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
