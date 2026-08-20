# Política de Segurança — ATLETICA FSA

## Reporte responsável

Vulnerabilidades que possam expor conta, papel, pedido, ingresso, pagamento, dado pessoal, credencial ou disponibilidade não devem ser publicadas com instruções exploráveis. Comunique a Presidência da ATLETICA FSA pelo canal institucional cadastrado no projeto e inclua uma descrição sanitizada, ambiente, impacto e passo mínimo de reprodução. Se o relato envolver credencial, revogue-a/rotacione-a no provedor antes de anexar qualquer evidência.

O reporte deve evitar informações pessoais, chaves, senhas, tokens, referências de pagamento e QR Codes de uso único. A equipe deve registrar um issue privado ou equivalente com prioridade, dono, mitigação, correção, testes de regressão e decisão de promoção.

## Classificação inicial

| Nível | Exemplos | Ação inicial |
|---|---|---|
| P0 | Bypass de RLS/RBAC, função privilegiada pública, pagamento indevido, segredo exposto, vazamento de dados | Mitigar ou desabilitar o fluxo; corrigir em homologação; aprovação da Presidência para produção. |
| P1 | Webhook sem idempotência, cron crítico falho, dead letter crescente, sessão/recuperação instável | Abrir correção prioritária, ensaiar em homologação e acompanhar alerta. |
| P2 | CSV/XLSX inseguro, ausência de ledger, lacuna de observabilidade | Planejar correção com teste de regressão e governança. |
| P3 | Ajuste de experiência, documentação ou performance sem risco operacional imediato | Planejar no backlog com critério de aceite. |

## Regras de correção

Todo incidente deve gerar teste de regressão. Alterações de RLS, grant, `SECURITY DEFINER`, webhook, cron, credencial, pagamento, dados ou migration requerem plano de rollback e evidência de homologação. Produção não é ambiente de teste; pagamentos seguem desativados até aprovação formal.

## Referências

[1]: ./docs/especificacao-qualidade-e-entrega-2026-08-19.md "Especificação de qualidade, testes e entrega segura"  
[2]: ./docs/auditoria-integral-plataforma-2026-08-19.md "Auditoria integral da plataforma"
