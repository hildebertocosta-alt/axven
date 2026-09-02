import Link from "next/link";

const services = [
  {
    title: "Gestão de mídia e performance",
    text: "Planejamento, operação e acompanhamento de campanhas digitais com foco em geração de demanda e oportunidades comerciais.",
  },
  {
    title: "Integração de leads e CRM",
    text: "Estruturação do fluxo entre plataformas de anúncios, formulários, CRM e atendimento para organizar a jornada comercial de cada cliente.",
  },
  {
    title: "Automações comerciais",
    text: "Automação de processos de captação, qualificação, distribuição e acompanhamento de leads, respeitando as permissões e finalidades de cada operação.",
  },
];

export default function InstitucionalPage() {
  return (
    <main className="min-h-screen bg-[#0d0d0e] text-[#f3efe7]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xl font-semibold tracking-[0.18em]">AXVEN</p>
            <p className="text-xs uppercase tracking-[0.28em] text-[#c88a4b]">Digital</p>
          </div>
          <Link href="/politica-de-privacidade" className="text-sm text-white/65 transition hover:text-white">
            Política de Privacidade
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
        <div>
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.22em] text-[#c88a4b]">Marketing, dados e operação comercial</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">
            Estrutura digital para transformar aquisição em processo comercial.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65">
            A Axven Digital presta serviços de marketing digital, gestão de campanhas, integração de leads, CRM e automações para empresas que buscam organizar e acompanhar sua operação de aquisição e atendimento.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-white/45">Como atuamos</p>
          <p className="mt-5 text-2xl font-medium leading-9">Conectamos mídia, dados e atendimento em uma operação mensurável.</p>
          <p className="mt-5 leading-7 text-white/55">
            Cada integração é configurada para o cliente autorizado, utilizando os dados necessários para receber solicitações de contato, apoiar o atendimento comercial e mensurar resultados.
          </p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm uppercase tracking-[0.22em] text-[#c88a4b]">Serviços</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {services.map((service) => (
              <article key={service.title} className="rounded-2xl border border-white/10 bg-[#111113] p-7">
                <h2 className="text-xl font-medium">{service.title}</h2>
                <p className="mt-4 leading-7 text-white/55">{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[#c88a4b]">Dados e integrações</p>
            <h2 className="mt-4 text-3xl font-semibold">Uso responsável das informações.</h2>
          </div>
          <div className="space-y-5 leading-7 text-white/60">
            <p>
              Quando uma empresa cliente autoriza uma integração, os dados de leads gerados em plataformas de anúncios podem ser encaminhados ao ambiente de CRM e atendimento utilizado naquela operação.
            </p>
            <p>
              As informações são utilizadas para atender a solicitação realizada pelo próprio usuário, acompanhar o processo comercial e analisar o desempenho das campanhas, conforme a finalidade informada na captação.
            </p>
            <Link href="/politica-de-privacidade" className="inline-block font-medium text-[#d79a5c] hover:underline">
              Consulte nossa Política de Privacidade →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Axven Digital. Todos os direitos reservados.</p>
          <p>Marketing digital · CRM · Integrações · Automações</p>
        </div>
      </footer>
    </main>
  );
}
