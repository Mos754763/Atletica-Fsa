# Diagnóstico — Construtor de Tabelas

## Evidência recebida

O usuário relatou uma exceção de servidor ao abrir a tabela **Fornecedores** após tentar adicionar o campo numérico opcional relacionado à quantidade mínima por pedido. As capturas informam o digest `1758802918`.

## Reprodução sem alterar dados de produção

Em 18 de agosto de 2026, a rota publicada `/admin/tabelas?table=ab7c5813-860a-45d2-88b5-a5fa245bba60` carregou corretamente, com a tabela **Fornecedores** e três campos existentes: `Nome` (texto obrigatório), `Produto Oferecido` (seleção múltipla) e `Ativo` (seleção única obrigatória). Portanto, a exceção não se reproduziu no carregamento atual da rota.

O fluxo de logs da Vercel está acessível na conta conectada e exige a seleção explícita do projeto `atletica-fsa`; esta será usada somente para leitura do erro histórico. Nenhum dado de produção será criado, alterado ou removido durante a investigação.

## Hipóteses técnicas a validar

1. Uma exceção transitória na ação de criar campo, sem persistência do quarto campo.
2. Uma resposta inesperada de metadados de campo, principalmente `config_json` nulo ou com formato inválido.
3. Uma falha de renderização do route segment imediatamente após `revalidatePath`, não do campo numérico em si.

## Causa confirmada nos logs da Vercel

Os logs de produção do projeto `atletica-fsa` confirmaram duas respostas `POST 500` em `/admin/tabelas`, às 23:48:45 e 23:50:51. O erro é um `ZodError` no campo `slug`, com a mensagem: **“Use letras minúsculas, números e hífens.”** e o mesmo digest exibido na captura (`1758802918`).

Portanto, o bloqueio não foi causado pelo tipo numérico opcional: ele ocorreu porque o identificador do campo continha caracteres fora do padrão técnico atual. A experiência do formulário é inadequada porque expõe essa validação como exceção de servidor. A correção deve gerar um identificador técnico automático a partir do nome, permitir a edição opcional e transformar erros de validação em mensagens de formulário claras, sem retorno 500.

## Proteção proposta

A correção deverá preservar números opcionais vazios como ausência de valor, validar números finitos e tolerar configurações de campo ausentes no carregamento. A cobertura automatizada deve incluir o valor vazio, um valor válido e entrada numérica inválida.
