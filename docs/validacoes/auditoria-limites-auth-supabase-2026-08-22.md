# Evidência — limites e proteção de autenticação no Supabase

**Data da verificação:** 22 de agosto de 2026  
**Ambiente verificado:** projeto Supabase de Production da ATLETICA FSA  
**Método:** leitura autenticada do painel Supabase, sem salvar alterações.

## Limites observados

| Controle | Configuração observada | Escopo informado pelo painel | Parecer |
| --- | ---: | --- | --- |
| E-mails de autenticação | 30 por hora | Projeto | Limita abuso de cadastro e recuperação que disparam e-mail. |
| Renovação de token | 150 por 5 minutos | IP | Compatível com sessões ativas, sem estar aberto. |
| Verificação de token/OTP | 30 por 5 minutos | IP | Limite ativo. |
| Usuários anônimos | 30 por hora | IP | Limite ativo. |
| Cadastro e login | 30 por 5 minutos | IP | Limite ativo para fluxos por e-mail/senha. |
| Cadastro/login Web3 | 30 por 5 minutos | IP | Limite ativo, embora o provedor não seja usado pela aplicação. |

## Proteções complementares

O painel indicou **CAPTCHA desativado**. A ativação depende de configuração prévia de um provedor CAPTCHA e de suas chaves no Supabase e no cliente; ela não foi habilitada para evitar um bloqueio de autenticação por configuração incompleta. A proteção contra senhas vazadas também estava indicada como desativada/pendente de configuração no painel e deve ser habilitada junto à verificação formal da configuração de e-mail/provedor.

O encaminhamento de IP estava disponível, mas não foi ativado: o login atual é iniciado diretamente pelo navegador com a chave publicável do Supabase, cenário em que o Supabase já limita pelo IP do cliente. Caso o fluxo seja futuramente movido para um proxy com chave secreta, esse controle deverá ser reavaliado e configurado com encaminhamento de IP confiável.

## Decisão técnica

O limite de **30 tentativas por IP a cada 5 minutos** permanece como controle efetivo de infraestrutura para login e cadastro. A aplicação passou a usar mensagens genéricas para impedir enumeração por detalhes de erro. Como melhoria externa pendente, a Presidência deve aprovar e fornecer a configuração CAPTCHA antes de habilitá-la, com teste de login, cadastro e recuperação em homologação.

## Referência

[1] [Supabase Auth — Rate limits](https://supabase.com/docs/guides/auth/rate-limits)
