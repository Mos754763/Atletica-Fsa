# Evidências de validação — ciclo de correções visuais e acesso

## Inspeção inicial

Em 14 de agosto de 2026, a inspeção da landing confirmou que a navegação pública continha apenas **Setores**, **Gestão**, **Loja**, **Eventos** e **Entrar**; os atalhos de ERP e ODS não estavam presentes no cabeçalho nem no rodapé.

Na mesma inspeção, as referências provisórias em `/manus-storage/` não foram atendidas pelo servidor da aplicação Next.js. Por isso, os ativos de setores e o mascote transparente foram publicados no bucket público `catalog-assets`, sob o prefixo `institutional/`, e as referências de código foram atualizadas para o helper institucional compartilhado.

## Verificação de disponibilidade

Os seis ativos publicados retornaram HTTP 200 no Supabase Storage: um mascote com transparência e as cinco imagens setoriais de Suprimentos, Eventos, Sociais, Marketing e Esportes.

As fotos de produto de estúdio já existentes também retornaram HTTP 200. O código removeu as pseudoformas geométricas que eram desenhadas sobre essas fotos, mantendo as imagens de produto acessíveis e sem sobreposição gráfica.

## Nova inspeção visual

Após a publicação no Supabase, a landing voltou a exibir o herói institucional com o mascote em composição azul e amarela, sem o fundo verde que motivou a correção. A navegação pública continuou restrita a **Setores**, **Gestão**, **Loja**, **Eventos** e **Entrar**.

A inspeção do herói também confirmou a composição de marca em azul-marinho, azul e amarelo, mantendo a leitura visual do mascote sem o bloco verde relatado.

Durante a conferência do asset isolado, foi identificado que uma versão anterior ainda possuía um preenchimento verde incorporado. Ela foi substituída por um novo recorte de mascote com transparência real, preservando o coelho com tapa-olho e uniforme FSA, sem plano de fundo, sombra de piso ou franja verde.
