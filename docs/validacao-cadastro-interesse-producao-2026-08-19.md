# Validação prática do cadastro de interesse em produção

**Data:** 19 de agosto de 2026

## Preparação

A landing pública em `https://atleticafsa.site/#participar` foi carregada com sucesso. A seção **VEM PRA FSA** estava presente e exibia o formulário de interesse com os campos Nome completo, E-mail, WhatsApp, Curso, Período, opções de áreas de interesse, mensagem opcional, honeypot Empresa e checkbox de consentimento.

O navegador localizou o botão **Quero participar** no final da seção pública, confirmando que o formulário está montado e interativo no deployment produtivo.

O caso de teste usará exclusivamente dados sintéticos sob o domínio `atleticafsa.test`. Após a confirmação de persistência, o registro será arquivado e preservado somente como trilha de auditoria.

Foram preenchidos os campos obrigatórios com o nome sintético `QA Produção Interesse FSA 2026` e o e-mail sintético `qa.producao-interesse.20260819@atleticafsa.test`. Os campos de contato e acadêmicos opcionais permanecem vazios para validar o menor conjunto de dados necessário.

## Resultado do envio

O envio pela landing retornou a confirmação visível: **"Cadastro recebido. A gestão da FSA vai analisar seu interesse e entrar em contato."**

O banco de produção confirmou a criação de um único registro com o status inicial `novo`, interesse `Esportes` e `consent_at` preenchido. Logo após a confirmação, o mesmo registro foi atualizado para `arquivado`, preservando a trilha de auditoria sem deixá-lo como demanda operacional ativa. Não houve qualquer alteração de estoque, preço, pedido, pagamento, evento, credencial ou outro dado produtivo.
