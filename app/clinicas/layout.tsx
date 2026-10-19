import type { Metadata } from "next";

const title = "Anúncios que viram paciente | Axven para clínicas de estética";
const description = "A Axven cuida dos anúncios da sua clínica e liga cada conversa do WhatsApp à venda. Veja quanto cada real investido voltou. A partir de R$ 990/mês.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, type: "website", locale: "pt_BR", siteName: "Axven Digital", url: "https://www.axvendigital.com.br/clinicas", images: ["/clinicas/hero-clinica-premium.jpg"] },
  twitter: { card: "summary_large_image", title, description, images: ["/clinicas/hero-clinica-premium.jpg"] },
};

export default function ClinicasLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
