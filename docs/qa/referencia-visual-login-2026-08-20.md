# Referência visual — login e hero da landing

Data da observação: 20 de agosto de 2026. Ambiente observado: Production em `https://atleticafsa.site`.

| Rota | Observação publicada | Implicação para a correção |
| --- | --- | --- |
| `/` | O hero apresenta o mascote FSA completo, enquadrado em composição circular azul, amarela e preta, na metade direita da tela. O personagem permanece legível e não concorre com a chamada da esquerda. | O login deve reutilizar esta presença institucional, em escala complementar à leitura do formulário. |
| `/login` | A coluna introdutória contém texto, orbes e fundo azul, mas o mascote não estava visível na captura desktop, embora o componente esteja presente na rota. | A correção deve tornar o mascote visível, com enquadramento controlado por viewport e fallback semântico preservado. |

As observações foram obtidas sem submissão de formulário, alteração de sessão, pedido, pagamento ou dado operacional.

## Validação da correção

Na prévia local atualizada, em 20 de agosto de 2026, o login foi conferido em **1440 × 1500 px** e **390 × 844 px**. A rota passou a usar o mesmo asset institucional do hero dentro de um viewport circular azul-escuro, com `object-fit: cover` e ponto focal à direita. Em desktop, o coelho fica separado do título e do formulário; em mobile, o viewport é reduzido com `clamp()` e mantém o personagem identificável sem provocar rolagem horizontal ou encobrir a chamada.

Os contratos de layout do login, a suíte completa, a verificação de tipos e o build de produção foram executados com sucesso. A validação não submeteu credenciais nem realizou alteração de sessão, pedido, pagamento ou dado operacional.
