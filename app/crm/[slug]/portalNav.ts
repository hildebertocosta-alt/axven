import type { NavItem } from "@/app/components/dashboard/Sidebar";

export function portalSidebarItems(slug: string): NavItem[] {
  return [
    { label: "Leads", href: `/crm/${slug}`, icon: "🧲" },
    { label: "Resultado", href: `/crm/${slug}/resultado`, icon: "📈" },
  ];
}
