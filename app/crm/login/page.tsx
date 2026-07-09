import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function CrmLoginPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const initialError =
    erro === "acesso_negado" ? "Acesso negado: este usuário não tem permissão para acessar este cliente." : null;

  return <LoginForm initialError={initialError} />;
}
