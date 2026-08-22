# Parecer técnico — auditoria de segurança da aplicação

**Projeto:** ATLETICA FSA  
**Data:** 22 de agosto de 2026  
**Escopo:** APIs Next.js, autenticação Supabase, exportação administrativa, ODS, checkout, crons e cabeçalhos HTTP.  
**Método:** revisão estática direcionada, contratos Vitest, build de produção local e requisições HTTP não destrutivas. Não foram alterados estoque, preços, pagamentos reais ou dados comerciais.

## Conclusão executiva

O lote de hardening reduz superfícies importantes de abuso, enumeração, clickjacking, exposição de erro e acesso indevido a objetos. A aplicação passou a emitir uma política explícita de enquadramento, a remover mensagens internas de autenticação e RPC da interface pública, a validar de forma estrita as entradas do ODS e a provar por teste o escopo de pedidos na retomada do checkout.

> O resultado não substitui uma revisão independente de todas as políticas RLS, funções `SECURITY DEFINER`, configuração do provedor Supabase e dependências de terceiros. Ele documenta o estado do código auditado e os controles verificados neste ciclo.

| Área | Situação após o lote | Evidência principal |
| --- | --- | --- |
| Rate limiting | **Parcialmente coberto** por Supabase Auth e controle próprio do formulário público | Limites de autenticação verificados no painel e limite público persistente de 10 tentativas/IP/hora. |
| CORS | **Seguro por padrão para same-origin** | Não há CORS permissivo; contratos proíbem `Access-Control-Allow-Origin: *` nas APIs protegidas. |
| PII/exportações | **Endurecido** | Exportação segue exclusiva de `admin`, permite somente conjuntos/formato/período autorizados e responde com `Cache-Control: no-store`. |
| JWT/sessão | **Endurecido** | Bearer é validado por `auth.getUser`; logout solicita revogação global e remove a sessão local em falha remota. |
| Enumeração | **Corrigido** | Login, cadastro, recuperação, redefinição e MFA não exibem mensagens textuais cruas do provedor. |
| Clickjacking | **Corrigido no build** | CSP com `frame-ancestors 'none'`, `X-Frame-Options: DENY`, COOP e CORP foram confirmados localmente. |
| SQL Injection | **Mitigado na superfície revisada** | Entradas do ODS são validadas por Zod; consultas usam query builder/RPC parametrizada. |
| IDOR/RBAC | **Coberto nos fluxos críticos** | Retomada filtra por `customer_id`; ODS exige papel operacional; exportação exige `admin`. |

## Controles implementados

### Autenticação, JWT e enumeração

O helper de API valida o bearer token enviado pelo cliente por meio de `supabase.auth.getUser(token)` antes de materializar o perfil e os papéis utilizados pelas rotas. Não foi identificado token de acesso em URL ou query string na superfície auditada. O logout passou a requisitar `signOut({ scope: "global" })`; se a operação remota falhar ou exceder o tempo definido, há uma limpeza local explícita antes do redirecionamento. Isso impede que uma falha de rede mantenha a sessão do navegador disponível para uso normal.

Mensagens de erro cruas do Supabase foram substituídas por respostas genéricas e acionáveis nos fluxos de login, cadastro, recuperação, redefinição de senha e MFA. O console registra apenas a categoria técnica do erro, sem propagar `error.message` para a interface. A recuperação mantém a resposta neutra, evitando confirmar se o endereço informado existe.

| Fluxo | Resposta pública | Detalhe do provedor exposto? |
| --- | --- | --- |
| Login por e-mail/senha | Credenciais inválidas / tentativa não concluída | Não |
| Cadastro | Cadastro não concluído | Não |
| Recuperação | Mensagem neutra sobre envio, se aplicável | Não |
| Nova senha | Solicitação de novo link quando necessário | Não |
| MFA | Orientação genérica para conferir o autenticador | Não |

### Limitação de taxa e abuso

O formulário público de interesse já aplica proteção própria com janela atômica de **10 tentativas por IP por hora**, honeypot, eventos de abuso e pseudonimização do IP por HMAC. Para login, cadastro e recuperação, o fluxo utiliza Supabase Auth diretamente no navegador e depende também dos limites administrados pelo provedor. A configuração de Production foi conferida em modo somente leitura: login/cadastro estavam em **30 por IP a cada 5 minutos**, e o envio de e-mails de autenticação em **30 por hora**.

O CAPTCHA do Supabase permanecia desativado. Ele não foi ligado sem a configuração completa do provedor para não impedir login, cadastro ou recuperação legítimos. A próxima ação externa é escolher e configurar um provedor CAPTCHA, aplicar as chaves no Supabase e no cliente e validar esses três fluxos em homologação. As diretrizes do Supabase distinguem explicitamente limites por endpoint e a proteção CAPTCHA como camada adicional [1].

### Cabeçalhos, clickjacking e CORS

O `next.config.ts` passou a desabilitar `X-Powered-By` e aplicar os seguintes cabeçalhos globais:

| Cabeçalho | Valor validado localmente | Objetivo |
| --- | --- | --- |
| `Content-Security-Policy` | `base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'` | Bloquear enquadramento e limitar vetores de injeção de documento. |
| `X-Frame-Options` | `DENY` | Defesa complementar contra clickjacking. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolar o contexto de navegação. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Restringir carregamento cross-origin de recursos protegidos. |
| `X-Content-Type-Options` | `nosniff` | Evitar interpretação MIME indevida. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Reduzir envio de contexto de navegação para outros domínios. |
| `Permissions-Policy` | câmera, microfone, geolocalização e pagamento desabilitados | Aplicar menor privilégio a recursos do navegador. |

As APIs da plataforma são same-origin e não receberam uma política CORS aberta. Foi adicionado contrato para impedir wildcard em endpoints protegidos. A ausência intencional de `Access-Control-Allow-Origin` é preferível à introdução de CORS sem uma necessidade interoperável comprovada. As proteções de clickjacking e os cabeçalhos complementares seguem a orientação do OWASP para aplicações web [2].

### Dados pessoais e exportação administrativa

A exportação permanece operacionalmente útil para `admin`, mas contém nome e e-mail em alguns conjuntos de dados. Esses campos não foram removidos de modo cego para não interromper obrigações operacionais; em vez disso, a rota conserva a guarda de administrador, allowlists de conjunto/formato/período e passou a impedir cache do download. Dessa forma, a minimização aplicada é de **acesso, escopo temporal e persistência em cache**, não de eliminação de campos necessários.

Qualquer futuro conjunto de exportação deve passar por revisão de finalidade, colunas necessárias, período mínimo e perfil autorizado. Este fluxo deve continuar em observação como processamento de maior impacto sob a LGPD.

### IDOR, autorização e SQL Injection

A retomada de checkout procura o pedido pelo identificador **e** por `customer_id = perfil autenticado`; o teste IDOR confirma que um pedido não retornado para o Cliente A não é enviado ao Mercado Pago nem revela dados do Cliente B. O ODS exige `admin`, `backoffice` ou `caixa` antes de qualquer RPC de operação. A exportação bloqueia perfis não administrativos.

As cargas úteis do ODS agora são schemas Zod estritos: UUIDs, estados permitidos, métodos de pagamento, campos de texto limitados e listas com limites de quantidade. Dados inválidos são rejeitados com `400` antes de consulta/RPC. Nas rotas revisadas, não há SQL textual interpolado com entrada do usuário; o acesso utiliza o query builder Supabase ou RPCs com argumentos nomeados. Essa medida reduz a superfície de injeção, mas a segurança completa continua dependente de RLS, grants e implementação segura de cada função SQL [3] [4].

Também foi criada uma guarda de cron reutilizável que compara o cabeçalho `Authorization: Bearer` em tempo constante. As quatro rotas de cron passaram a usar o helper, evitando comparações de prefixo diretamente em código de rota.

## Regressões automatizadas e validações executadas

| Validação | Resultado |
| --- | --- |
| Suíte unitária completa | **79 arquivos aprovados, 1 ignorado; 287 testes aprovados, 3 ignorados** |
| WCAG contraste | **18 testes aprovados** |
| WCAG teclado e leitores de tela | **4 testes aprovados** |
| TypeScript | **Aprovado** |
| `next build` de produção | **Aprovado** |
| Cabeçalhos no build local | CSP, XFO, COOP, CORP, `nosniff`, referrer e permissions policy confirmados |
| Contratos específicos de segurança | Login/enumeração, logout, JWT, CORS, headers, exportação, ODS, cron e IDOR aprovados |

O endpoint de Production ainda refletia somente os cabeçalhos já implantados no momento da consulta (`X-Frame-Options`, `nosniff`, referrer e permissions policy). A CSP, COOP, CORP e a remoção de `X-Powered-By` foram validadas no build local e precisam de conferência HTTP novamente **após** o deploy deste commit.

## Pendências e limites conhecidos

| Prioridade | Pendência | Condição de aceite |
| --- | --- | --- |
| Alta | Configurar CAPTCHA do Supabase | Provedor configurado, chaves seguras, login/cadastro/recuperação aprovados em homologação. |
| Alta | Conferir os cabeçalhos na Production pós-deploy | `curl -I https://atleticafsa.site/login` confirma CSP, COOP, CORP e ausência de `X-Powered-By`. |
| Média | Revisar periodicamente RLS e funções `SECURITY DEFINER` | Migrations, grants e políticas revisados com testes de conta cruzada em banco de QA. |
| Média | Rotacionar `CRON_SECRET` e `SYMPLA_API_TOKEN` | Novos segredos aplicados em Preview/Production e crons autenticados testados. |

## Referências

[1] [Supabase Auth — Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)  
[2] [OWASP — HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)  
[3] [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)  
[4] [OWASP — SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
