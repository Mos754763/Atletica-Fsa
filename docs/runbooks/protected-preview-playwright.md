# E2E público em Preview protegido

Este roteiro executa apenas as jornadas públicas de navegação em um Preview de homologação protegido pela Vercel. Ele não cria pedidos, não inicia checkout, não autentica usuários e não executa operações transacionais.

## Pré-requisitos e execução

Use um Preview de homologação — nunca o host de Production nem um alias da branch `main`. O executor recusa ambos antes de abrir o navegador. Informe as variáveis no ambiente do processo atual e mantenha o valor de acesso oculto no terminal:

```sh
export QA_ENVIRONMENT=homologation
export QA_BASE_URL='https://preview.example.vercel.app'
read -rs 'VERCEL_AUTOMATION_BYPASS_SECRET?Bypass temporário da Vercel: '
export VERCEL_AUTOMATION_BYPASS_SECRET
pnpm test:e2e:preview
unset VERCEL_AUTOMATION_BYPASS_SECRET
```

Também é aceito `QA_VERCEL_PROTECTION_BYPASS_SECRET` para compatibilidade, mas prefira `VERCEL_AUTOMATION_BYPASS_SECRET`. O executor só seleciona `tests/e2e/public-navigation.spec.ts` nos projetos `chromium` e `mobile-chromium`.

Uma `QA_VERCEL_SHARE_URL` não é aceita por este E2E: links compartilháveis são suportados apenas pelo smoke HTTP (`pnpm qa:homologation`). Eles não preservam acesso durante redirecionamentos completos do navegador. Se ela for a única forma de acesso disponível, o executor aborta antes de abrir o Playwright; gere um bypass de automação temporário na Vercel.

Antes de iniciar o navegador, o executor consulta somente `GET /api/qa/deployment-identity` no mesmo Preview, com o bypass temporário. A execução exige que o servidor confirme `VERCEL_ENV=preview`, o projeto esperado, um deployment identificado e uma ref Git diferente de `main`. Uma URL que apenas pareça Preview não substitui essa confirmação server-side.

O config remoto repete essa atestação em `globalSetup`, portanto uma invocação direta não ignora o preflight. Ele aceita apenas os marcadores internos emitidos pelo runner, exige HTTPS em `*.vercel.app` e fixa exclusivamente a navegação pública. Para cada request do navegador, o roteamento busca e devolve a resposta same-origin sem seguir redirects; cada hop é reavaliado e qualquer hop cross-origin tem os dois cabeçalhos de bypass removidos.

## Encerramento seguro

Assim que o teste terminar, revogue imediatamente no painel da Vercel o bypass usado e remova a variável do shell. Não reutilize, versione, cole em tickets ou registre esse acesso. O runner cria um diretório temporário exclusivo para a execução e o remove em `finally`; o remoto mantém trace, screenshot, vídeo e relatório HTML desativados. O bypass é aplicado por roteamento de contexto somente às requisições cujo origin seja exatamente o Preview atestado, e é removido explicitamente de qualquer requisição cross-origin.

O executor usa um reporter mínimo, descarta integralmente os fluxos stdout/stderr do filho e escreve apenas um status constante pelo processo pai. Ele não imprime detalhes de request, cabeçalhos, cookies ou mensagens de exceção do Playwright; isso impede que um bypass ou JWT temporário entre no log mesmo se uma rota falhar durante o encerramento.
