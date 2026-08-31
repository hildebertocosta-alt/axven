import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const CLIENT_WORKFLOWS: Record<string, string> = {
  "1b5b59aa-c29f-43fc-91e6-bf20855430b3": "aEOFROFiFzE3pNpG",
};

function bridgeBase() {
  return (process.env.AXVEN_N8N_BRIDGE_URL || "https://axven-n8n-audit-bridge-git-0135ed-hildebertocosta-alts-projects.vercel.app").replace(/\/$/, "");
}

async function bridge(path: string) {
  const r = await fetch(`${bridgeBase()}${path}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`Bridge n8n respondeu HTTP ${r.status}`);
  return r.json();
}

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("cliente_id")?.trim();
  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id,status")
    .eq("id", clienteId)
    .single();

  if (clienteError || !cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (cliente.status === "cancelado") return NextResponse.json({ error: "Cliente fora da carteira ativa" }, { status: 403 });

  const workflowId = CLIENT_WORKFLOWS[clienteId];
  if (!workflowId) return NextResponse.json({ error: "Cliente ainda não possui workflow n8n vinculado" }, { status: 404 });

  try {
    const [workflowRaw, executionsRaw] = await Promise.all([
      bridge(`/api/workflows/${encodeURIComponent(workflowId)}`),
      bridge(`/api/executions?workflowId=${encodeURIComponent(workflowId)}&limit=25`),
    ]);
    const workflow = workflowRaw?.data ?? workflowRaw;
    const executions = Array.isArray(executionsRaw?.data) ? executionsRaw.data : Array.isArray(executionsRaw) ? executionsRaw : [];
    return NextResponse.json({ workflow: { id: workflow?.id, name: workflow?.name, active: workflow?.active, updatedAt: workflow?.updatedAt }, executions: executions.map((x: Record<string, unknown>) => ({ id: x.id, status: x.status, startedAt: x.startedAt, stoppedAt: x.stoppedAt, workflowId: x.workflowId })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao consultar bridge n8n" }, { status: 502 });
  }
}
