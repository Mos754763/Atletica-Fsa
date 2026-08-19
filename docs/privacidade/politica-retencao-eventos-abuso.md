# Política de retenção — eventos de proteção do formulário público

**Status:** minuta operacional sujeita à revisão jurídica antes de publicação externa.  
**Escopo:** formulário público de interesse em integrar a ATLETICA FSA.

## Finalidade e minimização

O sistema registra apenas eventos necessários para proteger o formulário contra automação abusiva, medir bloqueios e investigar falhas técnicas. Não armazena a carga enviada, nome, e-mail, mensagem, telefone ou endereço IP em texto puro nos eventos de abuso. A origem é transformada por HMAC-SHA-256 com segredo mantido apenas no ambiente de servidor.

| Dado | Finalidade | Retenção operacional | Acesso |
|---|---|---|---|
| Identificador de origem pseudonimizado | Aplicar 10 tentativas por hora e correlacionar eventos técnicos | Contador: 2 horas; eventos: 30 dias | Serviço de backend; métricas apenas para Presidência |
| Tipo do evento | Distinguir honeypot, rate limit, validação recusada e falha técnica | 30 dias | Presidência |
| Data/hora e origem do formulário | Métricas e investigação de incidente | 30 dias | Presidência |
| Carga do formulário e IP bruto | Não coletados para essa finalidade | Não aplicável | Não aplicável |

## Base e transparência

A finalidade de segurança, prevenção a fraude e integridade do serviço deve ser documentada pela controladora sob a hipótese legal aplicável definida na revisão jurídica. O aceite de cadastro de interesse continua separado do monitoramento técnico; não condicione o exercício de direitos do titular a consentimento para telemetria desnecessária.

## Expiração e resposta a incidente

A rota protegida `/api/cron/member-interest-retention` executa diariamente e remove eventos com mais de 30 dias e janelas de contagem com mais de 2 horas. A Presidência deve revisar picos de bloqueio no ERP, registrar incidentes relevantes sem incluir dados pessoais adicionais e encaminhar solicitações de titulares pelo canal oficial de privacidade.

## Revisão periódica

Revise esta política a cada 12 meses, após incidentes relevantes, mudança no provedor de hospedagem ou alteração no formulário. Antes da publicação, preencher razão social, CNPJ, canal do encarregado e prazo de resposta a solicitações de titulares.
