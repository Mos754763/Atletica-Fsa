# Incidente de publicação — autenticação e imagens

## Evidência recebida

A página `/login` publicada exibe a mensagem **"Configuração pública do Supabase ausente."**. O formulário usa exclusivamente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; quando essas variáveis não são incorporadas durante o build da Vercel, login por senha, cadastro e Google OAuth falham antes de alcançar o Supabase.

## Diagnóstico inicial

O fluxo de login e callback usa URLs baseadas no domínio aberto pelo usuário, portanto o domínio configurado no Supabase é compatível em princípio. A investigação deve confirmar se o deployment em produção foi gerado após a inclusão das variáveis públicas e se os nomes/valores nas configurações de Production estão corretos.

## Correção planejada

Além de validar as variáveis no deploy, a aplicação passará a emitir uma mensagem de configuração mais acionável. O layout móvel terá o ornamento decorativo superior removido/contido e as fotos oficiais receberão um enquadramento focado no retrato, ocultando a moldura do Instagram.

## Evidências complementares

- A inspeção do deployment ativo confirmou que as variáveis públicas não foram incorporadas naquele build; o endpoint de recuperação ainda retornava `404` antes desta correção.
- A consulta somente leitura a `auth/v1/settings` não confirmou o provedor Google como habilitado. A configuração do provedor continua dependendo das credenciais OAuth no painel do Supabase/Google Cloud.
- Os retratos recebidos eram capturas 2048 × 1280 da publicação no Instagram. A janela institucional central de 700 × 875 px, iniciando em `(330, 195)`, remove a interface lateral, cabeçalho, comentários e controles do Instagram sem modificar a identidade das pessoas.
