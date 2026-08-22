# Referências OWASP — controles prioritários de segurança

**Data de consulta:** 22 de agosto de 2026.

| Controle em auditoria | Orientação externa relevante | Fonte |
|---|---|---|
| Limitação de tentativas e enumeração | Aplicar *login throttling* e manter respostas de autenticação, criação de conta e recuperação genéricas para não revelar se uma conta existe. | [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) |
| IDOR e autorização | Validar autorização de objeto em cada leitura, criação, alteração, exclusão e exportação; identificadores complexos não substituem a checagem de permissão. | [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html) |
| Privilégio mínimo | Negar por padrão, validar permissões em toda requisição e manter testes de autorização. | [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) |
| Clickjacking e cabeçalhos | Usar `X-Frame-Options: DENY` e, quando aplicável, CSP com `frame-ancestors`; revisar também `nosniff`, política de referenciador e demais cabeçalhos de defesa. | [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) |

Estas fontes serão usadas como critérios de revisão e de testes de regressão; não constituem prova de uma vulnerabilidade antes da confirmação no código e no ambiente autorizado.
