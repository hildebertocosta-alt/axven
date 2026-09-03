import Link from "next/link";

const solutions = [
  ["01", "Aquisição", "Estratégia de mídia e campanhas para gerar demanda e oportunidades comerciais."],
  ["02", "Automação & IA", "Processos inteligentes para acelerar atendimento, qualificação e operação."],
  ["03", "CRM & Comercial", "Organização da jornada do lead para transformar oportunidades em vendas."],
  ["04", "Dados & Performance", "Rastreamento e análise para aproximar investimento de resultado de negócio."],
];

const flow = ["Aquisição", "Lead", "Automação", "CRM", "Venda", "Dados", "Crescimento ↗"];

export default function InstitucionalPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0B0F] text-[#F5F5F7]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0B0F]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/institucional" className="flex items-end gap-2">
            <span className="text-2xl font-black tracking-[-.06em]">AXVEN</span>
            <span className="mb-1 text-[10px] font-bold uppercase tracking-[.22em] text-[#FF5A3C]">Digital</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#9B9BA4] md:flex">
            <a href="#solucoes" className="hover:text-white">Soluções</a>
            <a href="#metodo" className="hover:text-white">Método</a>
            <a href="#sobre" className="hover:text-white">Sobre</a>
          </nav>
          <a href="https://wa.me/5581995788220" className="rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF3D57] px-5 py-2.5 text-sm font-bold text-white">Fale com a Axven ↗</a>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 md:pt-32">
        <div className="absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-[#FF5A3C]/10 blur-[120px]" />
        <p className="mb-7 text-xs font-bold uppercase tracking-[.3em] text-[#FF5A3C]">Estratégia · Tecnologia · Performance</p>
        <h1 className="relative max-w-5xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-7xl lg:text-8xl">
          Crescimento não acontece <span className="text-[#FF5A3C]">por acaso.</span><br />Ele é construído.
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-8 text-[#9B9BA4] md:text-xl">
          Conectamos aquisição, automação, inteligência artificial, CRM e dados para construir estruturas de crescimento para empresas.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a href="https://wa.me/5581995788220" className="rounded-full bg-[#F5F5F7] px-7 py-3.5 font-bold text-[#0B0B0F]">Quero estruturar meu crescimento ↗</a>
          <a href="#metodo" className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-white/80">Conheça nosso ecossistema</a>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#111117] px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-xs font-bold uppercase tracking-[.16em] text-[#9B9BA4]">
          {flow.map((item, i) => <div key={item} className={i === flow.length - 1 ? "text-[#FF5A3C]" : ""}>{item}{i < flow.length - 1 && <span className="ml-4 text-white/20">→</span>}</div>)}
        </div>
      </section>

      <section id="solucoes" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-[#FF5A3C]">O que construímos</p>
            <h2 className="mt-5 text-4xl font-black tracking-[-.04em] md:text-5xl">Mais que tráfego.<br />Construímos crescimento.</h2>
            <p className="mt-6 max-w-md leading-7 text-[#9B9BA4]">Marketing não termina no clique. Estruturamos a jornada para que mídia, tecnologia e operação comercial trabalhem em torno do mesmo resultado.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {solutions.map(([n,title,text]) => (
              <article key={title} className="group rounded-3xl border border-white/10 bg-[#17171D] p-7 transition hover:-translate-y-1 hover:border-[#FF5A3C]/50">
                <span className="text-xs font-bold text-[#FF5A3C]">{n}</span>
                <h3 className="mt-8 text-2xl font-bold">{title}</h3>
                <p className="mt-3 leading-7 text-[#9B9BA4]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="metodo" className="border-y border-white/10 bg-[#111117]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-[#FF5A3C]">Ecossistema Axven</p>
          <h2 className="mt-5 max-w-4xl text-4xl font-black tracking-[-.04em] md:text-6xl">Do investimento ao resultado de negócio.</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-7">
            {flow.map((item, i) => <div key={item} className="bg-[#17171D] p-6"><span className="text-xs text-[#63636C]">0{i+1}</span><p className={`mt-8 font-bold ${i===6 ? "text-[#FF5A3C]" : ""}`}>{item}</p></div>)}
          </div>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-[#9B9BA4]">Nossa leitura de performance acompanha a última métrica de negócio disponível. Não paramos em alcance, clique ou lead quando é possível entender qual campanha gerou venda, receita e retorno.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-[2rem] border border-[#FF5A3C]/25 bg-gradient-to-br from-[#1D1D24] to-[#111117] p-8 md:p-14">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-[#FF5A3C]">Nossa visão</p>
          <blockquote className="mt-6 max-w-5xl text-3xl font-black leading-tight tracking-[-.035em] md:text-5xl">“Anúncios foram o começo. Construir crescimento virou a missão.”</blockquote>
        </div>
      </section>

      <section id="sobre" className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.28em] text-[#FF5A3C]">Axven Digital</p>
          <h2 className="mt-5 text-4xl font-black tracking-[-.04em] md:text-5xl">Estratégia e tecnologia trabalhando juntas.</h2>
        </div>
        <div className="space-y-5 text-lg leading-8 text-[#9B9BA4]">
          <p>A Axven nasceu da evolução de uma operação focada em mídia para uma empresa que integra estratégia, tecnologia, automação e dados.</p>
          <p>Nosso objetivo é tornar a aquisição mais organizada, mensurável e conectada à operação comercial — criando clareza para decidir onde melhorar e onde escalar.</p>
          <p className="font-semibold text-white">Hildeberto Junior <span className="font-normal text-[#63636C]">· Fundador da Axven Digital</span></p>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#FF5A3C] text-[#0B0B0F]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 py-16 md:flex-row md:items-center">
          <div><p className="text-sm font-bold uppercase tracking-[.2em]">Próximo passo</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em]">Vamos construir o próximo nível?</h2></div>
          <a href="https://wa.me/5581995788220" className="w-fit rounded-full bg-[#0B0B0F] px-7 py-4 font-bold text-white">Falar com a Axven ↗</a>
        </div>
      </section>

      <footer className="bg-[#0B0B0F]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10 text-sm text-[#63636C] md:flex-row md:items-center md:justify-between">
          <p>© 2026 Axven Digital. Todos os direitos reservados.</p>
          <div className="flex gap-5"><a href="https://instagram.com/axven_digital" className="hover:text-white">@axven_digital</a><Link href="/politica-de-privacidade" className="hover:text-white">Privacidade</Link></div>
        </div>
      </footer>
    </main>
  );
}
