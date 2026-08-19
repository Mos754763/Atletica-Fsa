# Promoção controlada — proteção contra abuso no cadastro de interesse

**Data:** 19 de agosto de 2026  
**Origem validada:** `homolog/member-interest-abuse-rate-limit-20260819`  
**Commits de origem:** `5b40f01`, `7ae4084` e `86b6bc0`  
**Escopo:** somente esquema de proteção do formulário público de interesse de membros.

## Alterações aplicadas

Foram aplicadas no Supabase de produção, nessa ordem, as migrations `20260819210000_member_interest_abuse_protection.sql` e `20260819211500_fix_member_interest_abuse_daily_metrics.sql`. O pacote criou os contadores pseudonimizados por janela horária, a telemetria minimizada de abuso, as RPCs restritas e a rotina de retenção automática. A segunda migration corrige o tipo da data retornada pelo histórico administrativo de sete dias.

## Verificação pós-migração

A checagem não destrutiva confirmou as duas tabelas `member_interest_rate_limits` e `member_interest_abuse_events`, as funções `consume_member_interest_rate_limit(...)` e `get_member_interest_abuse_daily_metrics(integer)`, além de RLS habilitado nas duas tabelas. A definição da função diária contém a conversão explícita `days.metric_day::date`, preservando o contrato do painel administrativo.

Nenhum cadastro de interesse, preço, estoque, pedido, pagamento ou outra informação operacional foi modificado nesta promoção. O gate `PAYMENTS_ENABLED` não faz parte das migrations nem do commit promovido e permanece fora do escopo.

## Pendências operacionais

O sistema usa `CRON_SECRET` como fallback enquanto a variável dedicada `MEMBER_INTEREST_ABUSE_HASH_SECRET` não estiver cadastrada na Vercel. Recomenda-se cadastrar a variável dedicada, com valor aleatório forte, nos escopos **Production** e **Preview** e então realizar um redeploy controlado. A proteção já funciona com o fallback existente, mas a separação de segredos reduz o acoplamento entre os controles.

O teste de honeypot foi coberto automaticamente; sua repetição manual no navegador conectado depende de uma sessão que permita preencher com segurança o campo oculto por meio das ferramentas de desenvolvimento. A visualização do painel no Preview também depende da correção do login de homologação já registrada no checklist de autenticação.
