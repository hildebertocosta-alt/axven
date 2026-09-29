import Link from "next/link";

// Abas no topo do portal: o menu lateral só aparece em telas grandes (lg),
// então no celular é por aqui que o cliente navega.
export function PortalTabs({ slug, active }: { slug: string; active: "leads" | "resultado" }) {
  const tabs = [
    { key: "leads" as const, label: "Leads", href: `/crm/${slug}` },
    { key: "resultado" as const, label: "Resultado", href: `/crm/${slug}/resultado` },
  ];

  return (
    <nav className="mb-5 flex gap-2 border-b border-white/10 pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            active === tab.key ? "bg-[#ff5a3c] text-zinc-950" : "text-zinc-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
