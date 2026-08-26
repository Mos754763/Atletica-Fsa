# Validação visual — login com tema escuro

**Data:** 22 de agosto de 2026  
**Escopo:** rota `/login`, paleta escura institucional e alternância manual de tema.

## Evidências verificadas

| Ambiente de inspeção | Resultado |
|---|---|
| Desktop, 1440 × 768, preferência escura do sistema | O layout permanece integralmente enquadrado; o cartão apresenta leitura confortável; o amarelo institucional destaca ação primária, links e foco; o mascote permanece totalmente visível. |
| Mobile, 390 × 844, preferência escura do sistema | A introdução, o mascote e o formulário seguem a coluna móvel sem recortes horizontais; o acionador de tema fica em área livre no topo. A continuação vertical do formulário é intencional e utilizável. |
| Alternância manual | A classe transitória é aplicada somente ao clique do usuário. Ela interpola cor de fundo, texto, bordas e sombras durante 280 ms, sem alterar opacidade, escala, posição ou a animação de entrada do mascote. |
| Redução de movimento | A troca é imediata quando `prefers-reduced-motion: reduce` está ativo. |

## Paleta aplicada

O painel passa a usar os azuis institucionais profundos `#04142e`, `#061a3d` e `#0d294f`, com amarelo FSA `#ffd23f` reservado para ênfase, ação e foco. Os campos usam `#061a32`, garantindo separação perceptível em relação ao cartão e ao painel.

## Validações automatizadas

Foram concluídos com êxito: `pnpm test` (**237 testes aprovados, 3 ignorados**), `pnpm typecheck` e `pnpm build`.
