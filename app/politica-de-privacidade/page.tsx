import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | Axven Digital",
  description: "Política de Privacidade da Axven Digital para integrações, formulários e tratamento de dados.",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        <div className="mb-12 border-b border-neutral-800 pb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-amber-500">Axven Digital</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Política de Privacidade</h1>
          <p className="mt-4 text-sm text-neutral-400">Última atualização: setembro de 2026</p>
        </div>
        <div className="space-y-10 leading-7 text-neutral-300">
          <section><h2 className="mb-3 text-xl font-semibold text-white">1. Objetivo</h2><p>Esta Política de Privacidade descreve como a Axven Digital trata dados pessoais recebidos por meio de formulários, campanhas digitais, integrações, sistemas de atendimento e ferramentas utilizadas na prestação de serviços de marketing, gestão de leads e automação.</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">2. Dados que podem ser tratados</h2><p>Conforme a interação realizada, podem ser tratados dados como nome, telefone, e-mail, respostas fornecidas em formulários, origem do contato, informações relacionadas à campanha ou anúncio e dados técnicos necessários para registrar e encaminhar o atendimento.</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">3. Finalidades do tratamento</h2><p>Os dados podem ser utilizados para receber e organizar solicitações de contato, encaminhar leads ao negócio responsável pelo atendimento, operar integrações e automações, acompanhar etapas comerciais, mensurar resultados de campanhas, melhorar processos e cumprir obrigações legais ou regulatórias aplicáveis.</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">4. Integrações e terceiros</h2><p>Para executar essas atividades, podem ser utilizadas plataformas de terceiros, incluindo serviços de publicidade, redes sociais, mensageria, automação, hospedagem, banco de dados e gestão de relacionamento. O tratamento realizado por cada fornecedor também está sujeito aos respectivos termos e políticas de privacidade.</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">5. Meta e formulários de leads</h2><p>Quando uma pessoa envia informações por formulários ou recursos disponibilizados em plataformas da Meta, os dados necessários ao atendimento e à mensuração da campanha podem ser recebidos e processados pelas integrações utilizadas pela Axven Digital e pelo negócio anunciante responsável pela campanha.</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">6. Segurança e retenção</h2><p>São adotadas medidas técnicas e organizacionais compatíveis com a natureza das operações para proteger os dados contra acesso, alteração, divulgação ou destruição não autorizados. Os dados são mantidos pelo período necessário às finalidades informadas, às relações contratuais e ao cumprimento de obrigações aplicáveis.</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">7. Direitos do titular</h2><p>O titular pode solicitar, nos termos da legislação aplicável, informações sobre o tratamento de seus dados, acesso, correção, eliminação quando cabível, oposição ou outras providências previstas na Lei Geral de Proteção de Dados Pessoais (LGPD).</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">8. Exclusão de dados</h2><p>Solicitações relacionadas à exclusão ou ao tratamento de dados pessoais podem ser encaminhadas pelos canais oficiais da Axven Digital. A solicitação será analisada considerando a identidade do solicitante, a relação com o negócio responsável pelos dados e eventuais obrigações legais de retenção.</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">9. Atualizações desta política</h2><p>Esta Política de Privacidade pode ser atualizada para refletir alterações operacionais, tecnológicas ou legais. A versão vigente será disponibilizada nesta página com a respectiva data de atualização.</p></section>
          <section><h2 className="mb-3 text-xl font-semibold text-white">10. Contato</h2><p>Para questões sobre privacidade ou tratamento de dados, entre em contato com a Axven Digital por meio de seus canais oficiais de atendimento.</p></section>
        </div>
      </div>
    </main>
  );
}
