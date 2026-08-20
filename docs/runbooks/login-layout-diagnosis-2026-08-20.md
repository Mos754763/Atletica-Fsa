# Diagnóstico visual — tela de login

**Data:** 2026-08-20
**Escopo:** `https://atleticafsa.site/login` e composição em `LoginForm.tsx`, `login/page.tsx` e `auth.css`.

## Evidência observada

No viewport desktop de referência, o painel esquerdo institucional ocupa a altura da tela, mas a marca, a assinatura e os elementos orbitais ficam concentrados na metade inferior. O painel direito, por sua vez, concentra o formulário na faixa superior. Essa assimetria cria uma grande área vazia visualmente desconectada e faz a página parecer desregulada, embora os controles do formulário permaneçam acessíveis.

## Hipótese de causa

A composição combina uma altura mínima de viewport no shell com espaçamentos verticais rígidos e posicionamento decorativo absoluto no painel de marca. A correção deve usar um grid de duas colunas com alinhamento vertical coerente em telas grandes, reduzir os espaçamentos em alturas menores e colapsar para uma única coluna com a marca resumida em mobile.

## Critérios de aceite

| Cenário | Resultado esperado |
|---|---|
| Desktop 1440 × 900 | Marca e formulário alinhados em zonas visuais equilibradas, sem bloco vazio dominante. |
| Laptop 1280 × 720 | Campos, ações e links permanecem acima da dobra e sem recorte. |
| Mobile 375 × 812 | Painel visual reduzido; formulário com largura, foco e contraste adequados. |
| Acessibilidade | Estados de foco visíveis, navegação por teclado e contraste preservados nos dois temas. |

## Limites

O ajuste não modifica os fluxos de login, OAuth, recuperação de senha, sessão, RBAC ou configuração do Supabase Auth.

## Verificação local após a correção

Em 20/08/2026, a rota `/login` foi verificada na instância isolada `https://3004-io8jifchrhofk1t2s21lr-e61a7ca3.us4.manus.computer/login`. A visualização desktop confirmou o cartão de autenticação centralizado verticalmente no painel branco, com marca, título, formulário e alternador de tema legíveis; o painel institucional permaneceu proporcional, sem o grande vazio inferior observado em Production. A checagem automatizada `auth-layout.test.ts` também aprovou os contratos de viewport seguro e de redução do painel visual em telas compactas.

O HTTP 500 encontrado anteriormente em `localhost:3003/login` não foi causado pela alteração de layout. A resposta do Next.js indicou cache de desenvolvimento inconsistente, com referência ausente a `.next/server/vendor-chunks/@supabase+auth-js@2.112.3.js` e processo antigo usando Next.js 15.5.23. Após encerrar esse processo, limpar apenas o diretório `.next` e reiniciar uma única instância em Next.js 16.3.1, a rota respondeu HTTP 200 e incluiu o conteúdo esperado. Não houve alteração em credenciais, ambiente ou lógica de autenticação.
