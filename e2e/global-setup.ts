import { clienteAdmin, criarDadosDeTeste } from "./apoio/dadosTeste";

export default async function globalSetup() {
  await criarDadosDeTeste(clienteAdmin());
}
