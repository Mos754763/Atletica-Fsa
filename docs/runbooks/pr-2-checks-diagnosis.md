# Diagnóstico de checks — PR #2

## Evidência observada em 2026-08-20

| Fonte | Resultado |
|---|---|
| API REST da pull request | `mergeable=true`, `rebaseable=true` e `mergeable_state=clean` para o commit `1b5ef86`. |
| Página de checks do GitHub | A pull request é exibida como **Ready to merge**. |
| Workflow `Continuous Integration` | Execução `#67` concluída com **Success**; o job de typecheck, testes e build foi aprovado. |
| Anotação do workflow | Há um aviso de compatibilidade: Node.js 20 está depreciado e algumas actions são forçadas a Node.js 24. O aviso não falhou o workflow. |
| Preview Vercel | O deployment `dpl_4i3TfzQegJYZCvp7V21jfL3tch8U`, associado ao commit `1b5ef86`, está em estado `READY`. |
| API de checks/status pelo token de integração | Retornou HTTP 403 (`Resource not accessible by integration`); isso limita a consulta programática, não prova falha do workflow. |

## Conclusão parcial

Não há conflito de merge, falha de integração contínua ou falha de preview visível. O estado `UNSTABLE` observado anteriormente não corresponde ao estado atual exibido pelo GitHub, que é **Ready to merge**, e deve ser tratado como uma leitura transitória de metadados antes da conclusão dos checks. Resta apenas avaliar a atualização explícita das actions do workflow para eliminar o aviso de Node.js 20, caso a documentação das actions confirme a compatibilidade com Node.js 24.

## Referências para o aviso de Node.js 20

As fontes oficiais consultadas em 2026-08-20 confirmam que `actions/checkout` v5 introduziu runtime Node.js 24, e que `actions/setup-node` v5 fez a mesma atualização. Ambas requerem runner v2.327.1 ou posterior, condição atendida pelos runners hospedados `ubuntu-latest` usados neste repositório. O `pnpm/action-setup` continua recomendado para pnpm v10 e anteriores; a versão declarada pelo projeto é `pnpm@10.4.1`, portanto a migração para o sucessor `pnpm/setup` não é aplicável sem uma atualização separada do gerenciador de pacotes.

- [actions/checkout — README oficial](https://github.com/actions/checkout)
- [actions/setup-node — README oficial](https://github.com/actions/setup-node)
- [pnpm/action-setup — README oficial](https://github.com/pnpm/action-setup)

## Correção e validação local

O workflow foi atualizado de `actions/checkout@v4`, `pnpm/action-setup@v4` e `actions/setup-node@v4` para `v5`, `v6` e `v5`, respectivamente. A aplicação continua usando Node.js 22; a mudança afeta apenas o runtime interno das actions no GitHub Actions. O teste `ci-workflow.test.ts` impede retorno às versões depreciadas e confirma a preservação de `node-version: 22`.

| Verificação local após a mudança | Resultado |
|---|---|
| Teste do contrato do workflow | 1 teste aprovado. |
| Typecheck | Aprovado. |
| Suíte completa | 45 arquivos aprovados, 1 ignorado; 149 testes aprovados, 3 ignorados. |
| Auditoria de dependências de produção | Nenhuma vulnerabilidade conhecida. |
| Build de produção | Aprovado com Next.js 16.3.1. |

A validação remota do novo workflow só será considerada concluída após o commit ser enviado e a execução correspondente no GitHub Actions terminar. Nenhuma inferência sobre os checks remotos deve ser feita antes dessa evidência.
