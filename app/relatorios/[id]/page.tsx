import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { notFound } from "next/navigation";
import CopiarLinkButton from "./CopiarLinkButton";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

function fmt(value: number, type: "currency" | "number" | "roi" = "number") {
  if (type === "currency") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
  if (type === "roi") return `${value.toFixed(1)}x`;
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPeriod(inicio: string, fim: string) {
  const d = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${d(inicio)} a ${d(fim)}`;
}

export default async function RelatorioPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: r } = await supabaseAdmin.from("relatorios").select("*").eq("id", id).single();
  if (!r) notFound();

  const isEcommerce = r.tipo === "ecommerce";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#2C2C2A", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "420px", width: "100%", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#3A3A38", border: "1px solid #484846", borderRadius: "16px", overflow: "hidden" }}>

          <div style={{ background: "#D85A30", padding: "1.5rem 1.5rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <p style={{ fontSize: "12px", color: "#ffffff", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Axven · Relatório semanal</p>
                <p style={{ fontSize: "22px", fontWeight: 500, color: "#ffffff", margin: 0 }}>{r.cliente_nome}</p>
                <p style={{ fontSize: "13px", color: "#a1a1aa", margin: "4px 0 0" }}>{formatPeriod(r.periodo_inicio, r.periodo_fim)}</p>
              </div>
              <CopiarLinkButton />
            </div>
          </div>

          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #484846" }}>
            <p style={{ fontSize: "12px", color: "#71717a", margin: "0 0 1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Resultados da semana</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

              <div style={{ background: "#484846", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 4px" }}>Investimento</p>
                <p style={{ fontSize: "20px", fontWeight: 500, color: "#ffffff", margin: 0 }}>{fmt(r.investimento ?? 0, "currency")}</p>
              </div>

              <div style={{ background: "#484846", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 4px" }}>Alcance</p>
                <p style={{ fontSize: "20px", fontWeight: 500, color: "#ffffff", margin: 0 }}>{fmt(r.alcance ?? 0)}</p>
              </div>

              <div style={{ background: "#484846", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 4px" }}>Cliques</p>
                <p style={{ fontSize: "20px", fontWeight: 500, color: "#ffffff", margin: 0 }}>{fmt(r.cliques ?? 0)}</p>
              </div>

              {isEcommerce ? (
                <>
                  <div style={{ background: "#484846", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 4px" }}>Pedidos</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "#ffffff", margin: 0 }}>{fmt(r.pedidos ?? 0)}</p>
                  </div>
                  <div style={{ background: "#484846", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 4px" }}>Receita</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "#10b981", margin: 0 }}>{fmt(r.receita ?? 0, "currency")}</p>
                  </div>
                  <div style={{ background: "#064e3b", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "#6ee7b7", margin: "0 0 4px" }}>ROI</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "#10b981", margin: 0 }}>{r.roi ? fmt(r.roi, "roi") : "—"}</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: "#484846", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 4px" }}>Leads</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "#ffffff", margin: 0 }}>{fmt(r.leads ?? 0)}</p>
                  </div>
                  <div style={{ background: "#064e3b", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "11px", color: "#6ee7b7", margin: "0 0 4px" }}>Custo por lead</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "#10b981", margin: 0 }}>{r.cpl ? fmt(r.cpl, "currency") : "—"}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "11px", color: "#52525b", margin: 0 }}>axvendigital@gmail.com</p>
            <p style={{ fontSize: "11px", color: "#52525b", margin: 0 }}>(81) 9 9578-8220</p>
          </div>

        </div>
      </div>
    </div>
  );
}
