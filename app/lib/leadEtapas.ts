// Regras do funil de leads dos clientes (Painel Axven · Entrega 1).
// Sem imports com alias ("@/…"), para poder ser testado direto com `node --test`.
// As mesmas regras valem no banco (gatilho leads_validar_etapa_trg); aqui elas
// servem para responder rápido e com mensagem clara antes de chamar o banco.

export type TipoEtapa = "novo" | "qualificacao" | "oportunidade" | "venda" | "perdido";

export type EtapaCliente = { chave: string; nome: string; tipo: TipoEtapa; ordem: number };

export const ETAPA_NOVO = "lead";
export const ETAPA_VENDA = "fechado";
export const ETAPA_PERDIDO = "perdido";

export const MOTIVOS_PERDA = [
  { chave: "preco", rotulo: "Preço" },
  { chave: "parou_de_responder", rotulo: "Parou de responder" },
  { chave: "sem_interesse", rotulo: "Sem interesse" },
  { chave: "comprou_em_outro_lugar", rotulo: "Comprou em outro lugar" },
  { chave: "fora_do_perfil", rotulo: "Fora do perfil" },
  { chave: "outro", rotulo: "Outro" },
] as const;

export type MotivoPerda = (typeof MOTIVOS_PERDA)[number]["chave"];

export type OrigemEtapa = "portal" | "axven" | "sync" | "sistema";

export type PedidoMudancaEtapa = {
  etapa: string;
  valor: number | null;
  moeda: string | null;
  dataConversao: string | null;
  motivo: MotivoPerda | null;
  motivoDetalhe: string | null;
};

const MOTIVOS = new Set<string>(MOTIVOS_PERDA.map((motivo) => motivo.chave));
const MOEDAS = new Set(["BRL", "USD", "EUR"]);
const CHAVE_ETAPA = /^[a-z][a-z0-9_]{1,39}$/;

const LEGADO: Record<string, { etapa: string; motivo: MotivoPerda | null }> = {
  agendado: { etapa: "oportunidade", motivo: null },
  proposta_enviada: { etapa: "oportunidade", motivo: null },
  nao_fechou: { etapa: ETAPA_PERDIDO, motivo: "outro" },
  desqualificado: { etapa: ETAPA_PERDIDO, motivo: "fora_do_perfil" },
};

export function normalizarEtapaLegada(etapa: string): { etapa: string; motivo: MotivoPerda | null } {
  return LEGADO[etapa] ?? { etapa, motivo: null };
}

const PESO_TIPO: Record<TipoEtapa, number> = { novo: 0, qualificacao: 1, oportunidade: 1, venda: 2, perdido: 3 };

export function ordenarEtapas(etapas: EtapaCliente[]): EtapaCliente[] {
  return [...etapas].sort((a, b) => PESO_TIPO[a.tipo] - PESO_TIPO[b.tipo] || a.ordem - b.ordem);
}

export function lerValorMonetario(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) && valor > 0 ? valor : null;
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().replace(/^R\$\s*/i, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export function interpretarMudancaEtapa(
  body: unknown,
  agora: Date = new Date(),
): { ok: true; pedido: PedidoMudancaEtapa } | { ok: false; erro: string } {
  const dados = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const bruta = typeof dados.etapa === "string" ? dados.etapa.trim() : "";
  if (!bruta) return { ok: false, erro: "Informe a etapa." };

  const { etapa, motivo: motivoLegado } = normalizarEtapaLegada(bruta);
  if (!CHAVE_ETAPA.test(etapa)) return { ok: false, erro: "Etapa inválida." };

  const pedido: PedidoMudancaEtapa = { etapa, valor: null, moeda: null, dataConversao: null, motivo: null, motivoDetalhe: null };

  if (etapa === ETAPA_VENDA) {
    const valor = lerValorMonetario(dados.valor);
    if (valor === null) return { ok: false, erro: "Informe o valor da venda." };
    const moeda = typeof dados.moeda === "string" && dados.moeda.trim() ? dados.moeda.trim().toUpperCase() : "BRL";
    if (!MOEDAS.has(moeda)) return { ok: false, erro: "Moeda inválida." };
    const dataTexto = typeof dados.data_conversao === "string" ? dados.data_conversao.trim() : "";
    const data = dataTexto ? new Date(dataTexto) : agora;
    if (Number.isNaN(data.getTime())) return { ok: false, erro: "Data da venda inválida." };
    pedido.valor = Math.round(valor * 100) / 100;
    pedido.moeda = moeda;
    pedido.dataConversao = data.toISOString();
  }

  if (etapa === ETAPA_PERDIDO) {
    const informado = typeof dados.motivo === "string" ? dados.motivo.trim() : "";
    const motivo = informado || motivoLegado;
    if (!motivo || !MOTIVOS.has(motivo)) return { ok: false, erro: "Escolha o motivo da perda." };
    pedido.motivo = motivo as MotivoPerda;
    const detalhe = typeof dados.motivo_detalhe === "string" ? dados.motivo_detalhe.trim().slice(0, 500) : "";
    pedido.motivoDetalhe = detalhe || null;
  }

  return { ok: true, pedido };
}

const ERROS_BANCO: Record<string, { status: number; mensagem: string }> = {
  etapa_invalida: { status: 400, mensagem: "Essa etapa não existe no funil deste cliente." },
  valor_venda_obrigatorio: { status: 400, mensagem: "Informe o valor da venda." },
  motivo_perda_obrigatorio: { status: 400, mensagem: "Escolha o motivo da perda." },
  lead_nao_encontrado: { status: 404, mensagem: "Lead não encontrado." },
};

export function traduzirErroEtapa(mensagemBanco: string | null | undefined): { status: number; mensagem: string } {
  const texto = mensagemBanco ?? "";
  const chave = Object.keys(ERROS_BANCO).find((codigo) => texto.includes(codigo));
  return chave ? ERROS_BANCO[chave] : { status: 500, mensagem: "Não foi possível atualizar o lead." };
}

export function paramsRpcEtapa(
  leadId: string,
  clienteId: string | null,
  pedido: PedidoMudancaEtapa,
  origem: OrigemEtapa,
  autorUserId: string | null,
): Record<string, unknown> {
  return {
    p_lead_id: leadId,
    p_cliente_id: clienteId,
    p_etapa: pedido.etapa,
    p_valor: pedido.valor,
    p_moeda: pedido.moeda,
    p_data_conversao: pedido.dataConversao,
    p_motivo: pedido.motivo,
    p_motivo_detalhe: pedido.motivoDetalhe,
    p_origem: origem,
    p_autor_user_id: autorUserId,
  };
}
