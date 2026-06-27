import { AppShell } from "../../components/dashboard/AppShell";
import { supabase } from "../../lib/supabase";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function fmt(value: number, type: "currency" | "number" | "roi" = "number") {
  if (type === "currency") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
  if (type === "roi") return `${value.toFixed(1)}x`;
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPeriod(inicio: string, fim: string) {
  const d = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${d(inicio)} a ${d(fim)}`;
}

export default async function RelatorioPublicoPage({ params }: { params: { id: string } }) {
  const { data: r } = await supabase.from("relatorios").select("*").eq("id", params.id).single();
  if (!r) notFound();

  const isEcommerce = r.tipo === "ecommerce";

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-0)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "420px", width: "100%", fontFamily: "var(--font-sans)" }}>
        <div style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>

          <div style={{ background: "var(--bg-accent)", padding: "1.5rem 1.5rem 1rem" }}>
            <p style={{ fontSize: "12px", color: "var(--text-accent)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Growthwave · Relatório semanal</p>
            <p style={{ fontSize: "22px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{r.cliente_nome}</p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>{formatPeriod(r.periodo_inicio, r.periodo_fim)}</p>
          </div>

          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid var(--border)" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Resultados da semana</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

              <div style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 4px" }}>Investimento</p>
                <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{fmt(r.investimento, "currency")}</p>
              </div>

              <div style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 4px" }}>Alcance</p>
                <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{fmt(r.alcance)}</p>
              </div>

              <div style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 4px" }}>Cliques</p>
                <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{fmt(r.cliques)}</p>
              </div>

              {isEcommerce ? (
                <>
                  <div style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 4px" }}>Pedidos</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{fmt(r.pedidos)}</p>
                  </div>
                  <div style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 4px" }}>Receita</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-success)", margin: 0 }}>{fmt(r.receita, "currency")}</p>
                  </div>
                  <div style={{ background: "var(--bg-success)", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "var(--text-success)", margin: "0 0 4px" }}>ROI</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-success)", margin: 0 }}>{r.roi ? fmt(r.roi, "roi") : "—"}</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 4px" }}>Leads</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{fmt(r.leads)}</p>
                  </div>
                  <div style={{ background: "var(--bg-success)", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "var(--text-success)", margin: "0 0 4px" }}>Custo por lead</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-success)", margin: 0 }}>{r.cpl ? fmt(r.cpl, "currency") : "—"}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>growthwave.contato@gmail.com</p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>(81) 9 9578-8220</p>
          </div>

        </div>
      </div>
    </div>
  );
}