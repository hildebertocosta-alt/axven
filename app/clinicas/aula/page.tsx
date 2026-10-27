import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import AulaLanding from "./AulaLanding";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap" });

const title = "Aula ao vivo para clínicas de estética | Axven Digital";
const description = "Aula ao vivo e gratuita na quarta, 18/11, às 19h30: o processo que a Axven usa com clínicas de estética, do anúncio ao atendimento no WhatsApp e ao acompanhamento de quem ainda não agendou.";
const shareImage = { url: "/clinicas/aula-compartilhar.png", width: 1200, height: 630, alt: "Aula ao vivo e gratuita para clínicas de estética, quarta 18/11 às 19h30" };

export const metadata: Metadata = {
  metadataBase: new URL("https://www.axvendigital.com.br"),
  title: { absolute: title },
  description,
  alternates: { canonical: "/clinicas/aula" },
  openGraph: { title, description, type: "website", locale: "pt_BR", siteName: "Axven Digital", url: "https://www.axvendigital.com.br/clinicas/aula", images: [shareImage] },
  twitter: { card: "summary_large_image", title, description, images: [shareImage.url] },
};

export default function AulaClinicasPage() {
  return <AulaLanding fontClassName={spaceGrotesk.className} />;
}
