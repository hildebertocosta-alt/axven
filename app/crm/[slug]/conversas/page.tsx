import { redirect } from "next/navigation";

// Conversas e Disparo saíram do portal (spec do Painel Axven, seção 5). O link antigo leva para Leads.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/crm/${slug}`);
}
