# Execução do roteiro operacional de validações — 18/08/2026

**Responsável técnico:** Manus AI  
**Escopo:** validações não destrutivas executadas antes dos ensaios que enviam mensagens externas ou criam dados de teste.  
**Regra de segurança:** `PAYMENTS_ENABLED` em Production não foi alterado.

## Resultados obtidos

| Verificação | Ambiente | Resultado | Evidência |
|---|---|---|---|
| Tipagem TypeScript | Repositório local | Aprovada | `pnpm typecheck` terminou sem erro. |
| Suíte automatizada | Repositório local | Aprovada | 32 arquivos aprovados; 108 testes aprovados; 3 skips intencionais em 33 arquivos. |
| Saúde da integração Sympla | Production | Sem erros no recorte observado | Painel Vercel: zero warnings, errors e fatals no intervalo exibido; `POST /admin/integracoes/sympla` respondeu 200. |
| Proteção do cron Sympla | Production | Aprovada | `GET /api/cron/sympla-sync` sem `Authorization` retornou 401 com `{"error":"Não autorizado."}`. |
| Proteção do cron de saúde | Production | Aprovada | `GET /api/cron/integration-health` sem `Authorization` retornou 401. |

## Interpretação

As rotas cron não expõem a sincronização nem o cálculo de saúde para chamadas não autenticadas. A execução com um `CRON_SECRET` válido permanece pendente porque deve ocorrer como ação controlada e ser correlacionada no painel da Vercel; esse segredo não foi lido, registrado nem exposto.

As próximas verificações exigem ações externas e serão conduzidas somente após confirmação operacional específica: envio real de e-mails a caixa externa, criação e inscrição de evento de teste, mensagem de teste em um canal Slack autorizado e, caso se queira testar cobrança, liquidação exclusivamente sandbox com nova autorização.

## Preparação do ensaio de e-mail

O painel de Authentication do Supabase de Production confirmou que a identidade administrativa `moises.754763@graduacao.fsa.br` está ativa e vinculada aos provedores Email e Google. A entrega real será validada para esta caixa por meio de um fluxo autorizado, sem redefinir a senha existente. O painel de usuários não apresentou uma ação direta de disparo de recuperação, portanto a evidência de envio deverá ser produzida pela rota de recuperação/convite suportada pela aplicação ou pelo fluxo administrativo oficial, preservando a senha atual.

Em 18/08/2026, o endpoint oficial de recuperação do Supabase aceitou o pedido para a caixa administrativa com `HTTP 200`, usando a origem pública `https://atleticafsa.site/auth/callback`. Nenhuma senha foi redefinida e nenhum token foi registrado. A etapa pendente é a confirmação humana de recebimento da mensagem, inspeção de spam e conferência do remetente `noreply@atleticafsa.site`.

## Ensaio isolado de ingresso gratuito — preparação

No ambiente Preview conectado à homologação, o administrador abriu o módulo Backoffice → Eventos e preencheu o evento temporário `HML — Ingresso gratuito 2026-08-18`. O formulário está limitado a uma vaga, preço `R$ 0,00`, local `Ambiente de homologação` e opção **Exigir inscrição ou ingresso** habilitada. A criação ainda não havia sido acionada neste ponto; nenhum dado de Production foi modificado e nenhum pagamento foi iniciado.

O evento foi criado com sucesso como **Divulgando**, exibindo `0/1 inscritos`, `0 pagos`, `0 pendentes` e `0 gratuitos`. O próximo passo do ensaio é a ação administrativa **Abrir inscrições**, seguida de uma inscrição gratuita e da validação idempotente do ingresso. A tela de origem permanece no Preview ligado à homologação: `https://atletica-5k6vuvt6n-moises-faustino-rodrigues-s-projects.vercel.app/admin/eventos`.

As inscrições foram abertas com sucesso. O estado operacional exibido é **Inscrições abertas** e a próxima transição disponível é `Iniciar evento`. Ainda não existe inscrição, pagamento ou ingresso emitido; o ensaio continua limitado ao ambiente de homologação.

Na agenda pública do Preview, o evento foi exibido corretamente e a ação `Fazer inscrição` foi acionada uma vez. A aplicação retornou para a mesma agenda com `?inscricao=erro`, sem emitir ingresso ou registrar pagamento. O erro ocorreu apenas em homologação e passa a ser investigado antes de qualquer nova tentativa; não houve alteração em Production.

Uma consulta somente leitura ao projeto `atletica-fsa-homolog` foi preparada para verificar os eventos e inscrições mais recentes. O editor do Supabase exibiu `0 rows` e uma mensagem de interface `query: Too small: expected string to have >=1 characters`, sem retorno tabular utilizável. Como a agenda do Preview havia exibido o evento criado, esta divergência será tratada como bloqueio de evidência: não serão feitas novas inscrições até confirmar, por uma consulta confiável, qual origem de banco o Preview utilizou e qual pré-requisito de emissão está ausente. Nenhum dado de Production foi consultado ou modificado por essa etapa.
