export type SymplaEnvironmentCopy = {
  eyebrow: string;
  safeguardsTitle: string;
  safeguardsDescription: string;
};

export function getSymplaEnvironmentCopy(vercelEnvironment = process.env.VERCEL_ENV): SymplaEnvironmentCopy {
  if (vercelEnvironment === "production") {
    return {
      eyebrow: "INTEGRAÇÕES · PRODUÇÃO",
      safeguardsTitle: "Controles operacionais de produção",
      safeguardsDescription:
        "Esta integração apenas lê a lista oficial de eventos da conta produtora. Antes de vincular um evento, defina o sistema mestre de vendas, capacidade, ingressos e check-in. Divergências são apresentadas para revisão e nunca conciliadas automaticamente.",
    };
  }

  return {
    eyebrow: "INTEGRAÇÕES · HOMOLOGAÇÃO",
    safeguardsTitle: "Limites de segurança da homologação",
    safeguardsDescription:
      "Esta etapa apenas lê a lista oficial de eventos da conta produtora. Antes de vincular um evento, defina o sistema mestre de vendas, capacidade, ingressos e check-in. Divergências são apresentadas para revisão e nunca conciliadas automaticamente.",
  };
}
