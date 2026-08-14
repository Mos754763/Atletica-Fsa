# Governança setorial implementada

O núcleo organizacional agora é sustentado por **setores como dados** — e não apenas pelos cinco cards da landing. A migração criou os setores oficiais, vínculos com histórico, o cargo de Presidente e concessões granulares por recurso e ação.

| Elemento | Implementação |
|---|---|
| Presidente | Coluna `profiles.is_president`, promovida inicialmente para o proprietário provisionado e protegida de alteração pelo cliente. |
| Setores | CRUD inicial pelo painel de Governança; setores podem ser desativados sem apagar histórico. |
| Pessoas | `sector_memberships` preserva começo, fim, autor, nota e papel de diretor, membro ou visualizador. |
| Diretor | Há no máximo um diretor ativo por setor. Uma substituição encerra o vínculo anterior de forma atômica. |
| Permissões | `permission_grants` registra visibilidade ou ações específicas por setor/recurso. Presidente mantém a gestão dessas concessões. |
| Segurança | RLS protege tabelas de governança; a movimentação de pessoa usa função transacional e valida a presidência no banco. |

O painel está em `/admin/organizacao` e só aparece para a Presidência. A área legada de Pessoas também passou a exigir Presidência para convite e mudança de papel global, evitando que um administrador operacional altere a estrutura de acesso.

> A ligação dos módulos comerciais atuais a um setor proprietário ainda depende da decisão **P13** — qual setor é dono da loja. Até ela ser definida, os módulos de dinheiro continuam no controle global já existente; não é seguro atribuir essa responsabilidade automaticamente.
