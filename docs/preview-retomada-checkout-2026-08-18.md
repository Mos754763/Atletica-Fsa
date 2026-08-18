# Evidência de Preview — retomada de checkout

Em 18 de agosto de 2026, o GitHub Actions da revisão `719f275` concluiu com sucesso. A Vercel iniciou automaticamente um novo deployment **Preview** a partir da branch `sincronizacao-sem-ci`, identificado pela revisão `719f275` e pelo título `fix: resume pending Mercado Pago checkout safely`.

No instante da verificação, o estado do Preview era **Building**. A versão de Production da mesma revisão estava **Ready**, mas não será usada para a liquidação sandbox: o ensaio continuará exclusivamente no Preview quando o build terminar.

Após uma nova verificação, o Preview continuava em estado **Building** após aproximadamente dois minutos. A origem prevista para essa revisão é `https://atletica-5k6vuvt6n-moises-faustino-rodrigues-s-projects.vercel.app`; ela deverá ser usada apenas com o bypass temporário já autorizado, nunca como substituta do domínio de Production.

O painel da Vercel confirmou novamente a mesma origem e a revisão `719f275`, ainda em estado **Building** após cerca de três minutos. A produção da mesma revisão permaneceu `Ready`; ela continua fora do escopo do ensaio sandbox.

Uma verificação direta da origem Preview confirmou que a aplicação da revisão `719f275` já respondia com sucesso e apresentava a landing da ATLETICA FSA. O painel de deployments ainda exibia `Building`, configurando uma divergência transitória de status; o ensaio continuará apenas com a origem Preview, nunca com a URL de Production.

O checkout pendente de homologação permanece com o valor de R$ 10,00 e deve ser retomado somente após a disponibilidade desse Preview. Nenhum token, URL de bypass ou dado de credencial é registrado neste documento.
