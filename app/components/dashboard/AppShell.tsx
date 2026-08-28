import type { ReactNode } from "react";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";

const navItems = [
  { label: "Dashboard", href: "/dashboard/executivo", icon: "◉" },
  { label: "Clientes", href: "/clientes", icon: "◎" },
  { label: "Financeiro", href: "/financeiro", icon: "💰" },
  { label: "Criativos", href: "/criativos", icon: "◌" },
  { label: "Relatórios", href: "/relatorios", icon: "◐" },
  { label: "Agenda", href: "/dashboard/agenda", icon: "📅" },
  { label: "CRM", href: "/pipeline", icon: "🧲" },
  { label: "Integrações", href: "/integracoes", icon: "🔌" },
];

type AppShellProps = {
  title: string;
  subtitle: string;
  activeLabel: string;
  children: ReactNode;
  actions?: ReactNode;
  sidebarStatus?: {
    lastUpdated: string | null;
  };
  variant?: "internal" | "portal";
  sidebarItems?: NavItem[];
};

export function AppShell({ title, subtitle, activeLabel, children, actions, sidebarStatus, variant = "internal", sidebarItems }: AppShellProps) {
  const items = sidebarItems ?? (variant === "portal" ? [] : navItems);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <Sidebar items={items} activeLabel={activeLabel} status={sidebarStatus} variant={variant} />

      <main className="lg:ml-72">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <section className="px-6 py-6 lg:px-8 lg:py-8">{children}</section>
      </main>
    </div>
  );
}
