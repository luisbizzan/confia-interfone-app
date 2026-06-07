# Estrategia de Testes com Playwright

## Objetivo

Criar uma suite de testes E2E para validar os fluxos principais do Confia Interfone Digital, cobrindo o backoffice web e o app em modo web.

O objetivo inicial nao e testar todos os detalhes visuais, mas garantir que os processos criticos funcionem de ponta a ponta:

- cadastro operacional no backoffice;
- login de portaria e morador no app;
- criacao e atendimento de chamadas;
- historico;
- regras de permissao e isolamento por condominio.

## Escopo da automacao

### Backoffice web

Playwright e a ferramenta principal para o backoffice.

Fluxos prioritarios:

- login como `ADMIN`;
- login como `CONSULTOR`;
- criar condominio com usuario/dispositivo da portaria;
- criar unidade padrao no onboarding do condominio;
- criar unidade adicional;
- criar morador vinculado a unidade;
- validar listagem de condominios;
- validar listagem de unidades;
- validar listagem de moradores;
- validar tela de portaria;
- validar tela de chamadas;
- validar tela de configuracoes/health check;
- criar condominio com `INTERCOM` habilitado;
- criar condominio com `INTERCOM` desabilitado;
- validar que a listagem administrativa exibe o status do recurso Interfone;
- validar regras de permissao:
  - `CONSULTOR` pode criar;
  - exclusoes futuras devem exigir `ADMIN`.

### App em modo web

Como o app usa Expo e React Native Web, Playwright pode validar os principais fluxos do app rodando no navegador.

Fluxos prioritarios:

- login como portaria;
- login como morador;
- identificacao automatica de perfil;
- home principal aparece apos login;
- atalho `Interfone` abre a experiencia operacional quando `INTERCOM = true`;
- atalho `Interfone` fica ausente ou indisponivel quando `INTERCOM = false`;
- aba `Configuracoes` mostra perfil e recursos do condominio;
- erro de renderizacao mostra tela amigavel de erro reportado;
- app grava relatorio em `app_error_reports` sem expor senha, token ou segredo;
- morador chama portaria;
- portaria ve chamada pendente;
- portaria atende chamada;
- portaria ve chamada em andamento;
- portaria encerra chamada;
- morador ve automaticamente a chamada em andamento apos atendimento da portaria;
- portaria chama unidade;
- morador ve chamada pendente;
- morador atende chamada;
- morador ve chamada em andamento;
- morador encerra chamada;
- morador chama outra unidade do mesmo condominio;
- historico atualiza apos as chamadas;
- morador nao consegue chamar a propria unidade;
- unidade sem morador ativo aparece bloqueada para chamada;
- usuario sem perfil operacional recebe erro/bloqueio.

## Fora do escopo do Playwright

Playwright nao deve ser a ferramenta principal para testar app nativo Android/iOS.

Playwright tambem nao deve validar audio real do LiveKit em ambiente nativo. Ele pode validar apenas os estados web e chamadas HTTP envolvidas no preparo da sala.

Para app nativo, ferramentas candidatas:

- Maestro;
- Detox;
- Appium.

Na primeira etapa, Playwright cobre o app pelo modo web. Depois, quando houver voz real, push e background, sera necessario complementar com testes mobile nativos.

Para a Fase 2 com LiveKit, Playwright pode validar:

- chamada passa para `ANSWERED`;
- experiencia focada `Em chamada` aparece;
- app chama a Edge Function `livekit-token`;
- resposta contem `serverUrl`, `roomName` e `token`;
- web prepara o token LiveKit automaticamente apos chamada atendida;
- web renderiza estado de token LiveKit pronto apos resposta valida;
- erro de token indisponivel aparece em tela quando secrets nao estiverem configurados.

Estado atual da infraestrutura LiveKit:

- projeto LiveKit Cloud criado;
- secrets cadastradas no Supabase;
- testes nao devem registrar nem imprimir `LIVEKIT_API_SECRET`;
- se uma chave for exposta em logs ou conversa, ela deve ser revogada antes de piloto real.

Validacao real de microfone/audio deve ser feita com:

- development build Expo;
- teste manual assistido em Android/iOS;
- posteriormente Maestro, Detox ou Appium.

No development build nativo, validar tambem:

- APK Android interno gerado pelo perfil EAS `development`;
- projeto Expo vinculado ao EAS correto antes da build;
- dependencia `expo-dev-client` na versao esperada pelo SDK Expo antes de investigar falhas Gradle;
- instalacao do development client no dispositivo de teste;
- conexao de sala LiveKit em chamada `ANSWERED`;
- audio bidirecional entre morador e portaria;
- controle `Mutar microfone` e `Ativar microfone`;
- desconexao da sala ao encerrar a chamada.

Registro da primeira build Android:

- A primeira build de desenvolvimento no EAS falhou na etapa Gradle.
- O log apontou erro Kotlin em `expo-dev-menu`.
- A causa foi a linha `expo-dev-client@55` em um app Expo SDK 54.
- A correcao esperada para a proxima tentativa e manter `expo-dev-client@~6.0.21` e confirmar `npx expo install --check` sem pendencias.

Registro da segunda build Android:

- A build EAS de desenvolvimento foi concluida com sucesso:
  - build `a1f446c8-a1f4-4014-b227-f53d17c1d917`.
- A partir dela, a validacao de voz sai do navegador e deve ser feita no Android instalado:
  - instalar o APK/development build;
  - iniciar o Metro Bundler para o app local quando necessario;
  - logar em duas sessoes de teste;
  - atender a chamada;
  - conectar as duas pontas ao audio LiveKit;
  - validar microfone, mute e encerramento.

Feedback observado no primeiro teste Android de voz:

- O fluxo funcional conecta, mas ainda nao e ergonomico:
  - originador chama;
  - aguarda o atendimento;
  - depois ainda precisa tocar em `Entrar no audio`.
- O criterio de UX passa a exigir experiencia proxima a uma ligacao do WhatsApp:
  - acao de chamada unica;
  - estado visual de chamando/recebendo/conectando/em chamada;
  - audio conectado automaticamente apos o atendimento;
  - toque sonoro para chamada recebida;
  - acao de ligar para unidade por icone em lista compacta.
- Teste nativo adicional obrigatorio:
  - confirmar que o audio padrao sai pelo fone do aparelho e nao inicia sempre em viva-voz;
  - validar troca controlada para alto-falante quando essa opcao existir.

Atualizacao de UX aplicada depois do primeiro feedback nativo:

- Morador e portaria deixam de manter chamada misturada a home quando existe estado ativo:
  - chamada recebida abre tela focada de atendimento;
  - chamada originada em `RINGING` abre tela focada de espera e cancelamento;
  - chamada `ANSWERED` abre tela focada de ligacao.
- O painel de voz da chamada atendida passa a preparar o audio automaticamente.
- O historico fica oculto na home ate a acao `Ver historico`.
- Listas de unidades ficam compactas e a acao de ligar passa a usar botao circular com icone de telefone.
- A chamada iniciada para unidade deve abrir a tela de espera logo depois da criacao, sem depender do proximo polling.
- O teste nativo deve confirmar a configuracao de rota de audio priorizando earpiece antes do alto-falante.
- Revisao visual no aparelho exige validar que:
  - a acao de chamada usa icone vetorial, sem emoji do sistema;
  - a propria unidade nao aparece como destino de ligacao do morador;
  - a tela de ligacao nao expoe o nome tecnico da sala LiveKit;
  - o alternador de saida troca entre fone e viva-voz com a sala conectada.
  - cabecalho Android respeita a barra de status do aparelho.
- a tela de espera da chamada nao oferece acao manual `Atualizar estado` para o usuario final.

Atualizacao apos modularizacao por recursos:

- O app passa a ter uma home principal com atalhos.
- `INTERCOM` e o primeiro feature flag operacional consumido pelo app.
- Playwright deve validar o caminho:
  - login;
  - home;
  - abrir Interfone pelo atalho;
  - voltar para Inicio pela navegacao inferior;
  - abrir Configuracoes;
  - conferir que Interfone aparece como habilitado.
- Em massa de teste com `INTERCOM = false`, Playwright deve validar que:
  - home nao permite acessar a operacao do Interfone;
  - navegacao inferior nao mostra a aba Interfone;
  - Configuracoes mostra o recurso como indisponivel.

Atualizacao apos toque/vibracao de chamada recebida:

- Playwright web deve validar apenas a tela visual de chamada recebida.
- Toque local e vibracao devem ser validados em teste nativo manual ou suite mobile, porque dependem de modulo nativo e comportamento do aparelho.
- No checklist nativo, validar:
  - chamada recebida toca enquanto esta em `RINGING`;
  - Android vibra durante chamada recebida;
  - toque e vibracao param ao atender;
  - toque e vibracao param ao cancelar/encerrar;
  - toque nao permanece em loop ao voltar para home.

Atualizacao apos monitor global de chamadas com app aberto:

- Playwright web deve validar que o app aberto detecta chamada recebida mesmo fora da aba `Interfone`.
- Fluxos novos para automacao:
  - morador logado permanece na Home;
  - portaria inicia chamada para a unidade do morador;
  - sessao do morador deve trocar automaticamente para a experiencia de chamada recebida;
  - morador atende;
  - sessao do morador deve trocar para chamada em andamento;
  - repetir o mesmo fluxo com morador ou portaria na aba `Configuracoes`.
- Como Playwright nao valida audio/vibracao nativos, os criterios nativos continuam manuais:
  - chamada recebida na Home toca e vibra;
  - chamada recebida em Configuracoes toca e vibra;
  - ao atender fora da aba Interfone, o audio LiveKit conecta como na tela Interfone;
  - ao abrir a aba Interfone durante uma chamada, nao deve existir duplicidade de telas ou chamadas.
- Teste de regressao:
  - com usuario dentro da aba Interfone, o monitor global nao deve criar uma segunda experiencia de chamada.
- Build nativo instalada para validacao manual:
  - EAS build Android `c705c3dc-34db-4f60-956c-a0ea26bb0fd9`;
  - commit `3ae6a64 Monitor calls outside intercom screen`;
  - APK `preview` instalado via ADB no aparelho `SM-N981B`;
  - abertura inicial confirmada por logcat sem crash nativo.

Atualizacao apos regra de ocupacao no backend:

- Playwright deve validar bloqueio operacional quando ja existe chamada ativa/pendente:
  - morador A chama portaria e mantem a chamada em `RINGING`;
  - morador B tenta chamar portaria;
  - app deve exibir `A portaria esta em atendimento. Tente novamente em alguns minutos.`;
  - portaria atende morador A e mantem a chamada em andamento;
  - morador B tenta novamente e recebe a mesma mensagem.
- Validar unidade ocupada:
  - portaria chama unidade A ou morador B chama unidade A;
  - outra origem tenta chamar unidade A;
  - app deve exibir `Esta unidade esta em atendimento. Tente novamente em alguns minutos.`
- Validar origem ocupada:
  - morador A esta em chamada;
  - morador A tenta iniciar outra chamada;
  - app deve exibir `Sua unidade esta em atendimento. Encerre a chamada atual antes de iniciar outra.`
- Validar que, apos `end_call`, a nova chamada volta a ser permitida.
- APK de referencia para teste manual com tres celulares:
  - EAS build Android `e15d1dcc-8ce6-4587-bd73-e001a95ce137`;
  - commit `73ff0d7 Document busy call target rule`;
  - artefato `https://expo.dev/artifacts/eas/tQ5krp8VidvgyVhsA8TB62.apk`;
  - instalado no aparelho conectado e abertura inicial confirmada por logcat.
- Diagnostico para reproducao de falhas reais:
  - a tabela `app_call_diagnostics` deve ser consultada apos testes com varios aparelhos;
  - cada clique de chamada deve gerar evento `STARTED`;
  - cada retorno da RPC deve gerar `SUCCESS` ou `ERROR`;
  - validar que erros de portaria/unidade ocupada aparecem em popup com botao `OK`;
  - validar que a mensagem de erro fica associada a acao executada e nao aparece em card errado;
  - no roteiro manual, anotar horario aproximado e aparelho usado para cruzar com `created_at`, `user_email`, `action` e `error_message`.
- APK de referencia com diagnosticos:
  - EAS build Android `78bd6c9f-1f1b-4a3f-911f-06dba4f903c3`;
  - commit `79c74d6 Add call diagnostics and popup errors`;
  - artefato `https://expo.dev/artifacts/eas/fUKuVBm5TsRJTFGVYEpysF.apk`;
  - validar em tres celulares e depois consultar `app_call_diagnostics` por horario aproximado.

Estrategia de push notifications:

- A automacao web cobre apenas o app aberto.
- Para app em segundo plano ou fechado, a estrategia passa a depender de teste mobile nativo.
- O plano recomendado para evitar retrabalho e usar `expo-notifications` com Expo Push Service:
  - Android e iOS usam a mesma API no app;
  - o backend armazena `ExpoPushToken` por usuario/dispositivo;
  - Edge Functions enviam notificacoes para chamadas e futuras funcionalidades;
  - depois, CallKit/ConnectionService podem melhorar a experiencia de chamada sem trocar o barramento de push.
- Playwright pode validar a parte administrativa futura:
  - token de push salvo no backend;
  - Edge Function de envio retorna sucesso para payload mockado;
  - feature flag de notificacao habilitada por condominio/pacote.

Atualizacao apos observabilidade de erros - Fase 1:

- Playwright deve validar a experiencia web de erro controlado usando uma rota/flag de teste futura, sem quebrar dados reais.
- Criterios:
  - ao provocar erro de renderizacao, a tela amigavel aparece;
  - mensagem nao exibe stacktrace para o usuario final;
  - relatorio e enviado ao Supabase;
  - payload contem `source`, `message`, `stack`, `component_stack`, `route`, `platform`, `app_version`, `user_id`, `condominium_id` e `profile`;
  - payload nao contem senha, JWT, `apikey`, `service_role`, `ADMIN_API_SECRET`, `LIVEKIT_API_SECRET` ou outros segredos.
- Testes nativos devem complementar:
  - erro em Android instalado;
  - app continua recuperavel pelo botao `Tentar novamente`;
  - erro offline nao quebra o app;
  - ao voltar a ficar online, estrategia futura pode reenviar eventos pendentes.
- Fase 2 da estrategia:
  - validar Edge Function `report-app-error`;
  - validar que o app envia o relatorio para a funcao;
  - validar fallback de insert direto apenas quando a funcao estiver indisponivel;
  - validar que `github.status = skipped` quando os secrets do GitHub nao existem;
  - validar criacao de issue no GitHub quando `GITHUB_TOKEN` e `GITHUB_REPOSITORY` estiverem configurados;
  - validar deduplicacao por `signature`;
  - validar que duas ocorrencias iguais reaproveitam a mesma issue e incrementam `occurrence_count`;
  - validar rate limit antes de liberar em piloto com muitos usuarios.

Simulador de erro:

- Rodar o app com `EXPO_PUBLIC_ENABLE_ERROR_TEST=true`.
- Login com usuario operacional.
- Abrir `Configuracoes`.
- Clicar em `Gerar erro de teste`.
- Validar que:
  - aparece a tela amigavel `Tivemos um problema`;
  - o stacktrace nao aparece para o usuario;
  - `app_error_reports` recebe o registro;
  - a Edge Function `report-app-error` retorna sucesso;
  - com `GITHUB_TOKEN` configurado, uma issue e criada no repositorio configurado;
  - ao repetir o mesmo teste, a assinatura e reaproveitada para deduplicacao.
- Rodar tambem com `EXPO_PUBLIC_ENABLE_ERROR_TEST=false` e validar que o botao nao aparece.

## Estrutura sugerida

Pode ser criado um novo projeto de testes, por exemplo:

```text
confia-interfone-tests/
  package.json
  playwright.config.ts
  tests/
    backoffice/
      auth.spec.ts
      condominium-onboarding.spec.ts
      units-residents.spec.ts
      calls-dashboard.spec.ts
      settings-health.spec.ts
    app/
      login-profile.spec.ts
      resident-calls.spec.ts
      gatehouse-calls.spec.ts
      call-history.spec.ts
      permissions.spec.ts
  fixtures/
    users.ts
    test-data.ts
  helpers/
    backoffice.ts
    app.ts
    supabase.ts
    test-run.ts
```

Alternativas:

- manter os testes dentro do repo `confia-interfone-digital`, se o foco inicial for backoffice;
- manter os testes dentro do repo `confia-interfone-app`, se o foco inicial for app;
- criar um terceiro repo `confia-interfone-tests`, se quisermos isolar QA/E2E dos produtos.

Recomendacao inicial: criar um terceiro repo ou uma pasta dedicada, porque os testes vao orquestrar backoffice, app e Supabase ao mesmo tempo.

## Ambientes

### Local

Backoffice:

```powershell
cd C:\Projetos\Confia\repo-github\apps\admin-web
npm run dev
```

App:

```powershell
cd C:\Projetos\Confia\confia-interfone-app
npx expo start -c --web
```

Playwright:

```powershell
npm run test:e2e
```

### Homologacao

Usar URLs publicadas:

- Backoffice Vercel;
- App web, quando publicado;
- Supabase remoto de homologacao.

### Producao

Rodar somente smoke tests seguros:

- carregar login;
- health check;
- login de usuario demo;
- leitura de listagens;
- nao criar massa operacional permanente sem limpeza.

## Variaveis de ambiente dos testes

Exemplo:

```text
BACKOFFICE_URL=http://localhost:3000
APP_URL=http://localhost:8081
BACKOFFICE_ADMIN_EMAIL=admin@example.com
BACKOFFICE_ADMIN_PASSWORD=senha
BACKOFFICE_CONSULTOR_EMAIL=consultor@example.com
BACKOFFICE_CONSULTOR_PASSWORD=senha
SUPABASE_URL=https://uvdwoisdcikzhqjwbhog.supabase.co
SUPABASE_ANON_KEY=<publishable-ou-anon-key>
TEST_RUN_PREFIX=E2E
```

Nao colocar nos testes:

- `service_role_key`;
- `ADMIN_API_SECRET`;
- senhas reais de cliente;
- segredos de producao.

Se for necessario criar/limpar dados por API administrativa, preferir ambiente de homologacao ou usar secrets protegidos no CI.

## Estrategia de dados

Cada execucao deve criar dados com prefixo unico:

```text
E2E-20260518-2230
```

Exemplo de massa:

- Condominio: `E2E Condominio 20260518-2230`
- Portaria: `e2e-portaria-20260518-2230@confia.test`
- Morador A1: `e2e-a1-20260518-2230@confia.test`
- Morador A2: `e2e-a2-20260518-2230@confia.test`
- Unidade A-1
- Unidade A-2

Fluxo recomendado:

1. Criar condominio pelo backoffice.
2. Criar portaria no mesmo fluxo.
3. Criar unidade A-1.
4. Criar morador A-1.
5. Criar unidade A-2.
6. Criar morador A-2.
7. Rodar fluxos de chamada.
8. Validar historico.

Limpeza:

- MVP: manter massa de teste identificada por prefixo.
- Fase posterior: criar rotina segura de limpeza no ambiente de homologacao.

## Plano de suites

### Suite 1 - Smoke

Objetivo: validar que os sistemas sobem e as rotas principais respondem.

Testes:

- backoffice abre tela de login;
- app abre tela de login;
- backoffice faz login;
- app faz login como portaria;
- app faz login como morador;
- configuracoes/health esta operacional.

### Suite 2 - Backoffice operacional

Objetivo: validar cadastro e manutencao dos dados usados pelo app.

Testes:

- criar condominio com portaria;
- criar unidade padrao;
- criar unidade adicional;
- criar morador;
- validar portaria vinculada;
- validar unidades e moradores nas listagens.

### Suite 3 - App operacional

Objetivo: validar chamadas sem voz real.

Testes:

- morador A-1 chama portaria;
- portaria ve chamada pendente;
- portaria atende;
- portaria ve painel de chamada em andamento;
- morador A-1 ve painel de chamada em andamento sem clicar em atualizar;
- portaria encerra chamada;
- historico mostra chamada atendida;
- portaria chama A-1;
- morador A-1 ve chamada pendente;
- morador A-1 atende;
- morador A-1 ve painel de chamada em andamento;
- morador A-1 encerra chamada;
- morador A-1 chama A-2;
- morador A-2 ve chamada pendente;
- morador A-2 atende.

### Suite 4 - Regras negativas

Objetivo: validar bloqueios esperados.

Testes:

- morador nao chama a propria unidade;
- usuario sem perfil nao entra;
- usuario inativo nao opera chamadas;
- unidade sem morador ativo nao recebe chamada;
- botao `Chamar unidade` fica desabilitado para unidade sem morador ativo;
- app nao mostra unidade de outro condominio.

## Seletores e estabilidade

Para Playwright ficar robusto, o ideal e adicionar `testID` ou `accessibilityLabel` nos componentes principais.

Padrao sugerido:

```text
login-email
login-password
login-submit
resident-call-gatehouse
resident-pending-call-answer
resident-active-call-end
resident-active-call-auto-refresh
resident-call-unit
resident-voice-prepare
resident-voice-ready
resident-voice-microphone-toggle
resident-voice-output-toggle
resident-unit-unavailable
gatehouse-call-unit
gatehouse-unit-unavailable
gatehouse-pending-call-answer
gatehouse-active-call-end
gatehouse-voice-prepare
gatehouse-voice-ready
gatehouse-voice-microphone-toggle
gatehouse-voice-output-toggle
call-history-list
```

No web, React Native pode expor esses atributos de forma diferente. Devemos validar e padronizar antes de escrever muitos testes.

## Comandos sugeridos

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:smoke": "playwright test tests/smoke"
  }
}
```

## CI/CD

GitHub Actions recomendado:

- instalar dependencias;
- instalar browsers do Playwright;
- subir app/backoffice quando o teste for local;
- ou apontar para URLs de homologacao;
- rodar smoke tests em pull requests;
- rodar suite completa em agendamento ou manual dispatch.

Fases de CI:

1. Smoke em PR.
2. Suite operacional em merge para `main`.
3. Suite completa manual antes de demonstracoes ou releases.

## Riscos e cuidados

- Testes E2E podem criar dados duplicados se nao houver estrategia de limpeza.
- Testes em producao devem ser limitados e seguros.
- Fluxos com chamadas dependem de estado e podem falhar se houver chamadas antigas tocando.
- Quando entrar voz real, Playwright nao sera suficiente para validar audio nativo.
- Push notification e background exigirao teste nativo.
- Build Android `preview` deve ser validado antes de demonstracoes, pois ele usa Hermes/release bundle e pode revelar erros que nao aparecem no Metro.
- O pacote `@supabase/supabase-js` esta fixo em `2.86.0` por compatibilidade com Hermes; upgrades futuros precisam rodar `expo export --platform android` antes de gerar APK.
- Dependencias nativas Expo devem ser conferidas com `npm ls expo-asset expo-font expo-constants expo-modules-core`, pois peer dependency de modulo nativo pode instalar versao de outro SDK e causar crash antes do app iniciar.
- Builds EAS precisam declarar o `environment` correto no perfil; sem isso, variaveis `EXPO_PUBLIC_*` podem existir no EAS mas nao entrar no APK.
- Variaveis usadas em `extra` devem ser resolvidas por `app.config.js`; `app.json` estatico nao substitui `$EXPO_PUBLIC_*`.

## Recomendacao de implementacao

Ordem sugerida:

1. Criar projeto base Playwright.
2. Criar smoke tests do backoffice.
3. Criar smoke tests do app.
4. Adicionar seletores estaveis no app/backoffice.
5. Automatizar criacao de condominio, portaria, unidades e moradores.
6. Automatizar fluxo morador -> portaria.
7. Automatizar fluxo portaria -> unidade.
8. Automatizar fluxo morador -> unidade.
9. Levar smoke tests para GitHub Actions.
10. Evoluir suite completa em ambiente de homologacao.
11. Antes de apresentar para cliente, rodar validacao nativa manual com APK `preview` instalado.
12. Em cada upgrade de SDK/dependencia, rodar export Android e smoke web.
13. Depois de instalar novo APK no Android, abrir o app uma vez antes dos testes funcionais para confirmar que nao ha crash nativo de bootstrap.

## Criterio de sucesso

A estrategia inicial sera considerada pronta quando conseguirmos rodar, de forma repetivel:

- login no backoffice;
- cadastro completo de condominio com portaria;
- cadastro de duas unidades com moradores;
- login no app como portaria e morador;
- chamada morador para portaria;
- chamada portaria para unidade;
- chamada morador para outra unidade;
- atendimento e encerramento de chamada;
- atualizacao automatica entre duas sessoes abertas;
- bloqueio visual de unidade sem morador ativo;
- validacao de historico.
- APK Android `preview` abre sem depender de Metro/QR local.
- APK Android `preview` passa pela abertura inicial sem tela nativa de feedback/crash.
- APK Android `preview` abre login real sem aviso de Supabase nao configurado.
- `expo config --type public` deve mostrar `extra.supabaseUrl` e `extra.supabaseAnonKey` resolvidos antes de gerar APK.
- Fluxo com 3 dispositivos deve validar que uma chamada entre duas unidades nao muda a portaria para tela de `Chamando` ou `Em chamada`.
- Fluxo com 3 dispositivos deve validar que a portaria ocupada exibe popup de ocupacao para nova chamada recebida, sem alterar a chamada em andamento.
- Fluxo com 3 dispositivos deve cruzar a UI com `app_call_diagnostics`: cada clique precisa gerar evento `STARTED` e terminar em `SUCCESS` ou `ERROR`.
- Testes automatizados devem cobrir o filtro de historico: morador ve chamadas de suas unidades; portaria ve somente chamadas recebidas/iniciadas pelo seu dispositivo; chamadas de unidade para unidade nao devem aparecer como estado ativo da portaria.
- Build de referencia para repetir o teste com 3 aparelhos: EAS Android `b886f035-a84c-4a27-884c-ec2edf68826a`, APK `https://expo.dev/artifacts/eas/oMAKKK1r6eqNqqjcgUcCW7.apk`.
- Validar que tela de chamada recebida nao exibe botao `Atualizar`; a atualizacao deve ocorrer por polling/estado.
- Validar que apos clicar em chamar portaria/unidade o app muda imediatamente para tela cheia de `Chamando`.
- Validar que encerramento de chamada nao mostra `Status: ANSWERED` ao usuario.
- Build de referencia com refinamentos dos videos: EAS Android `dd8556ac-bed0-4778-abf8-1b49547bb562`, APK `https://expo.dev/artifacts/eas/tmxZSDx6kN4WCcQPsaZC4L.apk`.
- Validar em aparelho fisico que o login se ajusta ao teclado, o botao `Entrar` continua acessivel e o submit pela tecla `done` funciona.
- Build de referencia com login ajustado: EAS Android `842568a1-3395-4ffe-a8bc-f449de4eea2b`, APK `https://expo.dev/artifacts/eas/hjrDdR8wRD6rTahzeMST9P.apk`.
- Validar que Configuracoes exibe versao instalada e build.
- Validar que unidade ocupada por chamada com portaria ou outra unidade aparece como `Em atendimento` para demais usuarios.
- Validar que erros inesperados de login/cancelar/encerrar chamada nao mostram stack/mensagem tecnica ao usuario e sao reportados ao backend.
- Validar futuramente politica de versao minima antes de liberar piloto externo.
- Build de referencia com disponibilidade/diagnostico/versionamento: EAS Android `4ac99f56-0865-4ecb-87ca-1d0715d66254`, APK `https://expo.dev/artifacts/eas/aeCQUFg9bR5Zh9723Ftutw.apk`.
- Validar no proximo build, apos liberar cota EAS ou build local, que Configuracoes mostra `1.0.1 (8)`.
- Build local Android gerado para contornar limite do EAS Free:
  - APK: `C:\Projetos\Confia\apks\confia-interfone-push-local-20260523.apk`;
  - comandos validados: `expo prebuild --platform android --clean --no-install`, `gradlew assembleDebug`, `gradlew assembleRelease`;
  - instalacao via ADB ficou pendente porque nenhum device estava visivel/autorizado no momento da tentativa.
- APK local com diagnosticos de push para repetir teste em background:
  - APK: `C:\Projetos\Confia\apks\confia-interfone-push-diagnostics-20260523.apk`;
  - foco: confirmar token em Configuracoes e eventos `push_registration`/`push_notification_dispatch`;
  - instalacao via ADB ficou pendente porque nenhum device estava visivel/autorizado no momento da tentativa.
- Validar que login em aparelho fisico solicita permissao de notificacao e grava token em `app_push_tokens`.
- Validar que Configuracoes exibe `Token registrado` quando o aparelho conseguiu criar token de push.
- Validar que o novo login com APK `1.0.3 (10)` grava tambem `native_push_token` e `native_push_provider = fcm` em `app_push_tokens`.
- Validar que `app_call_diagnostics` registra `push_registration` com `SUCCESS` no aparelho receptor.
- Caso Configuracoes mostre erro de notificacao, consultar `app_error_reports` e `app_call_diagnostics`.
- Em 24/05/2026, a falha confirmada foi falta de Firebase/FCM nativo no APK local: `Default FirebaseApp is not initialized`.
- APK local com Firebase Android configurado:
  - APK: `C:\Projetos\Confia\apks\confia-interfone-firebase-20260524.apk`;
  - validar se Configuracoes muda de erro para `Token registrado`;
  - se registrar token mas nao entregar push, validar credencial FCM V1 no Expo Push Service.
- Validacao de token em 24/05/2026:
  - `app_push_tokens` possui token ativo para morador Android;
  - `app_push_tokens` possui token ativo para portaria Android;
  - `push_registration` gravou `SUCCESS` para ambos.
- Teste posterior confirmou que a chamada aparece quando o app receptor volta ao foreground, mas nao chega como push em background.
- Proximo APK deve validar `push_dispatch_client` no app iniciador:
  - `SUCCESS`: app chamou a Edge Function;
  - `ERROR`: registrar mensagem da falha de invocacao;
  - ausencia do evento: app nao chegou ao bloco de disparo.
- APK local para esta validacao:
  - `C:\Projetos\Confia\apks\confia-interfone-push-dispatch-diagnostics-20260524.apk`;
  - instalar manualmente ou por ADB quando o aparelho estiver visivel;
  - depois do teste, consultar `app_call_diagnostics` por `push_dispatch_client` e `push_notification_dispatch`.
- Resultado do teste com este APK:
  - app iniciador gravou `push_dispatch_client = ERROR`;
  - backend gravou `push_notification_dispatch = ERROR` com `reason = invalid_call_id`;
  - Edge Function foi ajustada no backend para aceitar payloads alternativos sem novo build nativo.
- Teste seguinte confirmou que o payload continha a chave `call_id`, mas ainda falhava na validacao de UUID;
  - Edge Function foi ajustada para procurar UUID valido em valores aninhados do payload.
- Como a falha persistiu em device real, o backend passou a usar fallback por chamada `RINGING` recente do usuario autenticado quando o payload de push vier ilegivel.
- Teste posterior avancou ate o Expo Push Service, mas o ticket retornou `InvalidCredentials`;
  - teste de background so deve ser considerado valido depois de configurar FCM V1 no Expo/EAS;
  - comportamento estilo chamada do WhatsApp/Telegram deve entrar como suite nativa separada, porque exige CallKit/ConnectionService ou mecanismo equivalente.
- Credencial FCM V1 Android configurada no Expo/EAS em 25/05/2026; repetir teste nativo e validar que o ticket Expo nao retorna `InvalidCredentials`.
- Validar que erro tecnico `Call not found or not cancellable` nao aparece mais para usuario final.
- Validar que logout desativa o token em `app_push_tokens`.
- Validar que chamada morador -> portaria chama `send-call-notification` e envia push para o usuario da portaria.
- Validar que chamada portaria -> unidade chama `send-call-notification` e envia push para o morador da tentativa atual.
- Validar que chamada unidade -> unidade envia push apenas para a unidade de destino.
- Validar que `app_call_diagnostics` registra `push_notification_dispatch` com tickets do Expo ou motivo `no_tokens`.
- Validar que tocar na notificacao abre o app na area de Interfone.
- Validar que o iniciador da chamada nao recebe a propria notificacao.
- Validar que, sem token cadastrado, a Edge Function retorna `skipped: true` e nao quebra o fluxo da chamada.
- Validar que APK/loja possui credenciais FCM/APNs antes de considerar push em segundo plano pronto para apresentacao.
- Validar no proximo APK que a tela `Chamando` toca som de chamada para o usuario iniciador ate a chamada ser atendida, cancelada ou encerrada.
- Validar no proximo APK que a notificacao Android usa o canal `incoming-calls-v2` e toca o som customizado de chamada.
- Validar manualmente que o som da notificacao em background ainda e limitado ao comportamento de notificacao comum; chamada nativa persistente estilo WhatsApp/Telegram fica como suite separada com ConnectionService/CallKit.
- Validar APK Android `C:\Projetos\Confia\apks\confia-interfone-native-call-20260525.apk`:
  - logar portaria e morador para registrar token nativo;
  - colocar receptor em background;
  - iniciar chamada em outro aparelho;
  - confirmar se CallKeep/tela nativa abre ou se o app vem para foreground na area de Interfone;
  - consultar `app_call_diagnostics.metadata.fcm_results` na acao `push_notification_dispatch`.
- APK `C:\Projetos\Confia\apks\confia-interfone-native-call-20260525.apk` nao deve mais ser usado: apresentou crash nativo por incompatibilidade do `expo-task-manager`.
- Usar como APK de referencia para o proximo teste:
  - `C:\Projetos\Confia\apks\confia-interfone-native-call-fix-20260525.apk`;
  - versao esperada em Configuracoes: `1.0.4 (11)`;
  - primeiro criterio: app abrir sem tela de erro `AnyTypeCache`;
  - segundo criterio: login registrar token e permitir teste de chamada em background.
- APK `1.0.4 (11)` tambem nao deve mais ser usado: mostrou crash de `RNCallKeep` com TurboModules/New Architecture.
- Proximo APK deve validar:
  - `newArchEnabled = false`;
  - versao esperada em Configuracoes: `1.0.5 (12)`;
  - app abre sem erro de `RNCallKeep`;
  - login registra token e permite retomar teste de chamada nativa Android.
- APK local de reteste gerado em 25/05/2026:
  - `C:\Projetos\Confia\apks\confia-interfone-native-call-newarch-off-20260525.apk`;
  - primeiro criterio: instalacao limpa e abertura sem crash `Module exports two methods ... displayIncomingCall`;
  - segundo criterio: abrir Configuracoes e confirmar versao `1.0.5 (12)`;
  - terceiro criterio: logar portaria/morador, registrar tokens e repetir chamada com receptor em background;
  - se abrir sem crash mas CallKeep nao exibir chamada nativa, coletar `app_call_diagnostics` e seguir para ajuste especifico do fluxo nativo.
- Video de validacao `C:\Projetos\Confia\Videos Testes\WhatsApp Video 2026-05-25 at 19.23.19.mp4`:
  - confirmar que o push aparece com o app em background;
  - confirmar que tocar na notificacao abre a tela de chamada;
  - novo criterio para proximo APK: notificacao deve exibir acoes `Atender` e `Recusar`;
  - ao tocar em `Atender`, o app deve abrir no Interfone e tentar atender a chamada pelo backend;
  - se `Recusar` aparecer, validar apenas comportamento visual nesta etapa, pois rejeicao remota completa depende de RPC especifica de recusa.
- Proximo APK de teste deve mostrar versao `1.0.6 (13)` em Configuracoes e usar push com `categoryId = incoming_call`.
- APK local para esse teste:
  - `C:\Projetos\Confia\apks\confia-interfone-notification-actions-20260525.apk`;
  - instalado via ADB no aparelho conectado em 25/05/2026.
- Criterio visual adicional para o proximo APK:
  - versao esperada em Configuracoes: `1.0.7 (14)`;
  - barra inferior deve ficar acima da navegacao do Android;
  - botoes `Inicio`, `Interfone` e `Configuracoes` devem aceitar toque direto sem disputar com os botoes do sistema;
  - validar em tela de portaria e morador, principalmente em aparelho Samsung com navegacao por botoes.
- Novo criterio de estabilidade para o proximo APK:
  - versao esperada em Configuracoes: `1.0.8 (15)`;
  - APK local: `C:\Projetos\Confia\apks\confia-interfone-stable-notification-20260525.apk`;
  - com o app aberto, receber chamada nao deve minimizar/fechar o app;
  - com o app em background, receber chamada deve mostrar notificacao e abrir a tela de Interfone ao tocar;
  - confirmar se as acoes `Atender` e `Recusar` aparecem ao expandir a notificacao;
  - se as acoes nao aparecerem no heads-up compacto da Samsung, registrar como limite de notificacao comum e seguir para etapa nativa ConnectionService.
- Correcao para novo APK:
  - versao esperada em Configuracoes: `1.0.9 (16)`;
  - APK local: `C:\Projetos\Confia\apks\confia-interfone-no-callkeep-20260525.apk`;
  - o APK nao deve registrar `VoiceConnectionService` no Manifest;
  - o app nao deve acionar `CONFIA_NATIVE_CALL_BACKGROUND_TASK`;
  - repetir teste com app aberto recebendo chamada e confirmar que ele nao fecha/minimiza;
  - repetir teste com app em background e confirmar que a notificacao comum continua chegando.
- Criterio para som de notificacao:
  - versao esperada em Configuracoes: `1.0.10 (17)`;
  - APK local: `C:\Projetos\Confia\apks\confia-interfone-sound-channel-v3-20260525.apk`;
  - push de chamada deve usar canal Android `incoming-calls-v3`;
  - com app em background, validar vibracao e som `call_ringtone.wav`;
  - se continuar sem som, abrir configuracoes do app no Android e conferir se o canal `Chamadas recebidas` esta permitido com som.
- Criterio para versao minima obrigatoria:
  - versao esperada em Configuracoes no proximo build: `1.0.11 (18)`;
  - backend deve conter tabela `app_version_policies`;
  - com `minimum_build` menor ou igual ao build instalado, app libera login/uso;
  - ao elevar temporariamente `minimum_build` acima do build instalado, app deve bloquear antes do login com tela `Atualizacao necessaria`;
  - teste deve voltar `minimum_build` para valor valido ao terminar.
- Criterio para escalonamento de chamada em unidade com mais de um morador:
  - cadastrar dois moradores ativos na mesma unidade com `call_order` diferente;
  - iniciar chamada para essa unidade;
  - nao atender no primeiro morador por pelo menos 20 segundos;
  - aguardar o `call-timeout-processor`;
  - validar que `call_attempts` marca o primeiro como `NO_ANSWER` e cria tentativa `RINGING` para o segundo;
  - validar que `app_call_diagnostics` registra `push_notification_dispatch` para a nova tentativa;
  - no aparelho do segundo morador, validar chegada de push ou chamada visivel se o app estiver aberto.
- Criterio visual de marca:
  - app deve usar a paleta do `GOOGLE-PLAY-PREPARACAO.md`;
  - azul principal `#0B4EA2`, azul claro `#1267C9`, vermelho `#E1272D`, texto escuro `#0B1F3A`;
  - conferir Login, Home, Interfone, Chamada e Configuracoes;
  - conferir splash e icone instalavel usando os assets `confia-system-logo-preview.png` e `confia-system-mark-preview.png`.
- Criterio do APK com namespace definitivo:
  - APK local: `C:\Projetos\Confia\apks\confia-system-1.0.11-18-preview-20260601.apk`;
  - package Android esperado: `br.com.confia.system`;
  - versao esperada em Configuracoes: `1.0.11 (18)`;
  - app deve abrir como `Confia System` e usar icone/splash da nova marca;
  - login deve continuar usando Supabase real pelas variaveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`;
  - push deve registrar token no novo app Firebase `confia-system`;
  - se `minimum_build` no Supabase for maior que `18`, o app deve bloquear com tela de atualizacao obrigatoria;
  - se `minimum_build` for menor ou igual a `18`, o app deve liberar login, Home e Interfone.
- Criterio do APK com login corrigido:
  - APK local: `C:\Projetos\Confia\apks\confia-system-1.0.11-18-login-logo-20260601.apk`;
  - tela de login deve exibir a logo `Confia System`;
  - tela de login nao deve exibir mais `Interfone Digital`;
  - apos login, abrir Configuracoes e confirmar `Notificacoes: Token registrado`;
  - se chamadas nao gerarem notificacao, validar no backend:
    - existe registro recente em `app_push_tokens` para o usuario receptor com `app_version = 1.0.11` e `app_build = 18`;
    - existe `native_push_provider = fcm`;
    - `app_call_diagnostics` registra `push_notification_dispatch`;
    - secret `FIREBASE_SERVICE_ACCOUNT_JSON` do Supabase pertence ao Firebase `confia-system`, nao ao projeto antigo `confia-interfone`.
- Criterio do APK com Firebase definitivo:
  - APK local: `C:\Projetos\Confia\apks\confia-system-1.0.11-18-firebase-prod-20260601.apk`;
  - app Android deve usar Firebase `confia-system-prod`;
  - package Android esperado: `br.com.confia.system`;
  - app deve exibir `Confia System` como nome/label;
  - depois de instalar, fazer logout/login em cada aparelho para registrar novo token;
  - em Configuracoes, confirmar `Notificacoes: Token registrado`;
  - testar chamada com receptor em primeiro plano, background e tela bloqueada;
  - validar no Supabase `app_call_diagnostics` se `fcm_results` retorna sucesso para o projeto `confia-system-prod`.
- Criterio do APK com correcao de provider FCM:
  - APK local: `C:\Projetos\Confia\apks\confia-system-1.0.11-18-fcm-provider-fix-20260601.apk`;
  - apos login, tokens Android novos devem registrar `native_push_provider = fcm`;
  - tokens Android antigos com `native_push_provider = android` tambem devem ser considerados pela Edge Function;
  - em `app_call_diagnostics`, `fcm_token_count` deve ser maior que zero quando houver receptor logado;
  - `fcm_results` deve conter respostas do FCM, nao mais `reason = no_native_tokens`;
  - `Expo Push` pode continuar retornando `InvalidCredentials`, mas o criterio de aceite deste fluxo e entrega pelo FCM nativo.
- Criterio para ambiente Supabase Prod:
  - ambiente Prod esperado: `https://mhcszjmnktzftcllrhce.supabase.co`;
  - app publicavel deve usar `br.com.confia.system` e Firebase `confia-system-prod`;
  - `.env` local de build publicavel deve estar com `EXPO_PUBLIC_ENABLE_ERROR_TEST=false`;
  - primeiro login em cada aparelho deve registrar token em `app_push_tokens` no Prod;
  - criar um condominio piloto no backoffice apontado para Prod antes do teste mobile;
  - validar morador chamando portaria, portaria chamando morador e morador chamando outra unidade no Prod;
  - validar chamada com receptor em primeiro plano, background e tela bloqueada;
  - validar `app_call_diagnostics` no Prod para confirmar entrega FCM nativa;
  - validar reporte automatico de erro no Prod apos login de um usuario real;
  - confirmar que o erro cria registro em `app_error_reports` e issue no GitHub.
- Criterio de separacao staging/producao:
  - `develop` deve apontar para staging em testes internos;
  - `main` deve apontar para production em builds de loja;
  - APK local gerado para a pasta `C:\Projetos\Confia\apks` deve ser precedido por `npm run env:staging`;
  - AAB de publicacao deve ser precedido por `npm run env:production`;
  - antes de qualquer build, abrir `.env` e conferir a URL esperada do Supabase;
  - Vercel Preview/Staging deve usar variaveis do Supabase staging;
  - Vercel Production deve usar variaveis do Supabase production.
- Criterio de validacao Vercel Production:
  - apos qualquer alteracao de variaveis Production, executar redeploy;
  - abrir `/configuracoes` em Production;
  - resultado esperado: tela `Saude do ambiente` com status operacional;
  - contador de condominios em Production deve refletir o Supabase Prod, inicialmente `0`;
  - se aparecer `Unauthorized`, revisar `ADMIN_API_SECRET` em Vercel Production e Supabase Prod.
- Criterio de validacao Vercel Preview/Staging:
  - deploy staging deve ser gerado a partir do branch `develop`;
  - variaveis `Preview (develop)` devem apontar para Supabase staging `uvdwoisdcikzhqjwbhog`;
  - se aparecer `NEXT_PUBLIC_SUPABASE_URL is not configured`, o deploy provavelmente nao usou o branch `develop` ou foi criado antes das variaveis;
  - apos ajustar variaveis Preview, fazer novo deploy do branch `develop`;
  - resultado esperado em `/configuracoes`: ambiente operacional e contador com os condominios do staging.
- Criterio do AAB de producao:
  - antes do build, executar `npm run env:production`;
  - executar `npm run typecheck`;
  - gerar com `cd android && .\gradlew.bat bundleRelease`;
  - arquivo esperado: `C:\Projetos\Confia\apks\confia-system-1.0.11-18-production-20260601.aab`;
  - confirmar assinatura com `jarsigner -verify`;
  - apos o build, executar `npm run env:staging`;
  - subir inicialmente no Google Play em teste interno ou fechado;
  - validar instalacao via Play Store antes de promover para producao.
- Criterio da politica de privacidade:
  - URL esperada: `https://confia-interfone-digital-admin-web.vercel.app/politica-de-privacidade`;
  - a pagina deve abrir sem sessao do backoffice;
  - a pagina nao deve redirecionar para `/login`;
  - validar que o texto contem dados tratados, finalidades, seguranca, retencao, direitos LGPD e contato;
  - validar responsividade em mobile e desktop;
  - usar essa URL no campo de Politica de Privacidade do Google Play Console.
- Criterio da branch Android native call:
  - branch esperada: `feature/android-native-call-service`;
  - versao esperada no app: `1.0.12 (19)`;
  - APK experimental de staging confirmado: `C:\Projetos\Confia\apks\confia-system-1.0.12-19-decline-background-STAGING-CONFIRMED-20260606.apk`;
  - `.env` do APK experimental deve apontar para Supabase staging `uvdwoisdcikzhqjwbhog`;
  - antes de entregar APK local, validar `android/app/build/intermediates/assets/release/mergeReleaseAssets/app.config`;
  - `app.config` deve conter `supabaseUrl = https://uvdwoisdcikzhqjwbhog.supabase.co`;
  - se `app.config` contiver `mhcszjmnktzftcllrhce`, o APK foi gerado para producao e deve ser descartado para testes develop;
  - Manifest nao deve conter `VoiceConnectionService` nem `react-native-callkeep`;
  - Manifest nao deve conter `ExpoFirebaseMessagingService` nesta branch experimental;
  - Manifest nao deve conter permissao `READ_PHONE_NUMBERS`;
  - Manifest deve conter `ConfiaFirebaseMessagingService`, `ConfiaCallActionReceiver` e `USE_FULL_SCREEN_INTENT`;
  - chamada FCM data-only com `kind = incoming_call` deve acionar notificacao nativa de chamada;
  - notificacao deve aparecer com prioridade alta/full-screen quando o aparelho permitir;
  - notificacao deve usar template nativo `CallStyle` quando o Android/fabricante permitir;
  - notificacao deve exibir acoes `Atender` e `Recusar` quando o fabricante permitir;
  - tocar em `Atender` deve abrir o app na area de Interfone e executar `answer_call`/`answer_portaria_call`;
  - tocar em `Recusar` deve executar `decline_call` no Supabase staging;
  - tocar em `Recusar` na notificacao nativa nao deve abrir o app;
  - tocar em `Recusar` deve remover a notificacao da tela e da central de notificacoes;
  - apos `Recusar`, validar em `app_call_diagnostics` um registro `native_decline_call` com `SUCCESS` quando o receptor tinha sessao sincronizada;
  - se houver mais de um morador na unidade chamada, `Recusar` pelo primeiro morador deve gerar nova tentativa e novo push para o proximo morador;
  - apos tocar em `Atender` ou `Recusar`, a notificacao nativa deve desaparecer da tela e da central de notificacoes;
  - erro `Call not found or not ringing` nao deve ser exibido ao usuario em texto tecnico;
  - erros reais dos botoes de notificacao devem gerar `reportAppError` com `source = call-action-error`;
  - se a portaria recusar, a chamada deve sair da tela do originador como cancelada/encerrada;
  - se um morador recusar e houver outro morador na mesma unidade com ordem posterior, o proximo morador deve receber a tentativa;
  - se os botoes aparecerem mas nao acionarem o app, validar se o APK instalado e `decline-callstyle-STAGING-CONFIRMED-20260606` ou posterior;
  - validar app aberto, segundo plano, tela bloqueada, Samsung e Xiaomi;
  - validar em `app_call_diagnostics` que o push FCM foi enviado e que o app receptor registrou novo token depois de logar.
- Criterio do modulo de mensagens:
  - feature flag `MESSAGING` deve estar habilitado para o condominio de teste;
  - na Home/Interfone, cards de Portaria e Unidades devem exibir botao circular de mensagem ao lado do botao de ligacao;
  - morador deve abrir conversa com a portaria pelo botao de mensagem do card `Portaria`;
  - portaria deve abrir conversa com uma unidade pelo botao de mensagem da lista de unidades;
  - morador deve abrir conversa com outra unidade pelo botao de mensagem da lista de unidades;
  - morador nao deve abrir conversa consigo mesmo;
  - usuario nao deve listar ou abrir conversas de outro condominio;
  - envio de texto deve persistir em `messages` e aparecer na conversa apos atualizar;
  - envio de imagem/anexo deve subir arquivo para o bucket `message-attachments`;
  - anexo maior que 10 MB deve ser bloqueado antes do envio ou rejeitado pelo backend/storage;
  - preview de imagem deve usar URL assinada, sem expor bucket publico;
  - cada conversa portaria-unidade deve reutilizar a mesma thread;
  - cada conversa unidade-unidade deve reutilizar a mesma thread independentemente de quem iniciou;
  - nova mensagem deve chamar a Edge Function `send-message-notification`;
  - receptor com app aberto deve receber atualizacao ao abrir a tela de mensagens;
  - receptor com app em background deve receber notificacao de nova mensagem quando houver token push registrado;
  - tocar na notificacao de mensagem deve abrir a tela `Mensagens`;
  - `cleanup_expired_message_attachments` deve marcar anexos vencidos como apagados e remover objetos do Storage;
  - agendamento `cleanup-expired-message-attachments` deve existir no Supabase e executar diariamente a limpeza;
  - teste de retencao deve criar anexo com `expires_at` anterior a data atual e executar a RPC de limpeza;
  - APK local para teste inicial:
    - `C:\Projetos\Confia\apks\confia-system-1.0.13-20-messaging-STAGING-CONFIRMED-20260606.apk`;
    - versao esperada em Configuracoes: `1.0.13 (20)`;
    - ambiente esperado: Supabase staging `uvdwoisdcikzhqjwbhog`;
  - Playwright web pode validar login, botoes, lista de conversas, envio de texto e abertura da tela;
  - anexos e notificacoes devem ser complementados com teste nativo Android, porque dependem de seletor de midia, Storage e push.
  - hotfix 06/06/2026:
    - APK local para reteste:
      - `C:\Projetos\Confia\apks\confia-system-1.0.14-21-message-notification-attachment-STAGING-CONFIRMED-20260606.apk`;
      - versao esperada em Configuracoes: `1.0.14 (21)`;
      - ambiente esperado: Supabase staging `uvdwoisdcikzhqjwbhog`;
    - upload de imagem/anexo no Android deve funcionar sem erro `Network request failed`;
    - envio de mensagem deve acionar `send-message-notification` com sessao autenticada;
    - receptor em outra tela do app deve receber notificacao/atualizacao de mensagem;
    - receptor em background deve receber notificacao nativa de mensagem;
    - tocar na notificacao de mensagem deve abrir a aba `Mensagens`;
    - se a notificacao de mensagem nao aparecer, validar no Supabase:
      - token push registrado para o usuario receptor;
      - Edge Function `send-message-notification` executada sem erro;
      - payload FCM com `kind = message`.
  - hotfix complementar 06/06/2026:
    - consulta de servidor confirmou 2 arquivos `.jpg` orfaos no bucket `message-attachments` apos falha de envio;
    - consulta de servidor confirmou `message_notification_dispatch` com erro `Invalid message_id`;
    - APK local para reteste:
      - `C:\Projetos\Confia\apks\confia-system-1.0.15-22-message-attachment-pushfix-STAGING-CONFIRMED-20260606.apk`;
      - versao esperada em Configuracoes: `1.0.15 (22)`;
      - ambiente esperado: Supabase staging `uvdwoisdcikzhqjwbhog`;
    - teste de anexo deve validar:
      - arquivo selecionado aparece como pendente;
      - ao tocar em enviar, uma nova mensagem com anexo aparece na conversa;
      - tabela `message_attachments` recebe uma linha para o anexo;
      - bucket `message-attachments` recebe o objeto;
      - se o envio falhar apos upload, o app remove o objeto do Storage;
    - teste de notificacao deve validar:
      - `app_call_diagnostics.action = message_notification_dispatch` com `result = SUCCESS`;
      - receptor em outra tela recebe notificacao;
      - receptor em background recebe notificacao;
      - tocar na notificacao abre a aba `Mensagens`.
  - hotfix de envio e tela de mensagens 06/06/2026:
    - consulta de servidor confirmou novas mensagens persistidas e novas falhas de push por `Invalid message_id`;
    - consulta de servidor confirmou novos objetos `.jpg` no bucket `message-attachments`, portanto o teste deve diferenciar upload no Storage de vinculacao real em `message_attachments`;
    - APK local para reteste:
      - `C:\Projetos\Confia\apks\confia-system-1.0.16-23-message-send-layout-pushfix-STAGING-CONFIRMED-20260606.apk`;
      - versao esperada em Configuracoes: `1.0.16 (23)`;
      - ambiente esperado: Supabase staging `uvdwoisdcikzhqjwbhog`;
    - teste de texto deve validar:
      - apos tocar em enviar, o campo de texto fica vazio;
      - a mensagem aparece uma unica vez do lado correto;
      - `messages.id` usado no push e um UUID real;
      - `app_call_diagnostics.action = message_notification_dispatch` registra `SUCCESS`;
    - teste de anexo deve validar:
      - arquivo selecionado aparece como pendente;
      - apos tocar em enviar, o anexo pendente desaparece do composer;
      - `storage.objects` recebe o objeto;
      - `message_attachments` recebe uma linha vinculada a `message_id`;
      - receptor visualiza ou recebe link/preview do anexo na conversa;
      - se o envio falhar depois do upload, o objeto nao deve permanecer orfao no Storage;
    - teste visual deve validar:
      - nao existe espaco vazio grande abaixo do input;
      - teclado nao encobre o composer;
      - navegacao inferior continua acessivel;
      - tela funciona em morador e portaria.
  - hotfix de legenda/anexo e push de mensagem 06/06/2026:
    - APK local para reteste:
      - `C:\Projetos\Confia\apks\confia-system-1.0.17-24-message-attachment-caption-notification-STAGING-CONFIRMED-20260606.apk`;
      - versao esperada em Configuracoes: `1.0.17 (24)`;
      - ambiente esperado: Supabase staging `uvdwoisdcikzhqjwbhog`;
    - teste de anexo sem texto:
      - tocar no clipe;
      - selecionar uma imagem;
      - validar preview do anexo no composer;
      - nao digitar legenda;
      - tocar em enviar;
      - validar que a mensagem com anexo aparece na conversa;
      - validar que `message_attachments` recebeu linha vinculada ao `message_id`;
      - validar que o receptor visualiza o anexo;
    - teste de anexo com legenda:
      - selecionar imagem;
      - digitar legenda;
      - enviar;
      - validar texto e imagem na mesma mensagem;
    - teste de remocao de anexo:
      - selecionar imagem;
      - tocar no botao remover;
      - validar que o preview desaparece;
      - validar que o objeto previamente enviado ao Storage foi removido;
    - teste de notificacao de mensagem:
      - enviar texto simples;
      - enviar anexo sem texto;
      - enviar anexo com legenda;
      - em todos os casos, validar `app_call_diagnostics.action = message_notification_dispatch`;
      - resultado esperado: `SUCCESS`;
      - `metadata.fcm_token_count` deve ser maior que zero quando o receptor tiver token registrado;
      - receptor em background deve receber notificacao nativa de mensagem;
      - tocar na notificacao deve abrir a aba `Mensagens`;
      - se voltar `Invalid message_id`, validar se o app instalado e de fato `1.0.17 (24)` ou posterior.
  - hotfix de UX de mensagens, preview e notificacao 06/06/2026:
    - APK local para reteste:
      - `C:\Projetos\Confia\apks\confia-system-1.0.18-25-messages-notification-image-preview-STAGING-20260606.apk`;
      - versao esperada em Configuracoes: `1.0.18 (25)`;
      - ambiente esperado: Supabase staging `uvdwoisdcikzhqjwbhog`;
    - teste de anexo sem legenda:
      - tocar no clipe;
      - selecionar uma imagem;
      - validar preview no composer com texto de legenda opcional;
      - nao digitar texto;
      - tocar no botao enviar;
      - validar que a mensagem e criada com imagem mesmo sem legenda;
      - validar que o input continua vazio apos o envio.
    - teste de preview de imagem:
      - tocar em uma imagem enviada ou recebida;
      - validar abertura em tela cheia;
      - tocar no botao fechar;
      - validar retorno para a conversa sem perder scroll/contexto.
    - teste de estabilidade da conversa:
      - deixar a tela de conversa aberta por pelo menos 20 segundos;
      - validar que o polling nao causa reload visual quando nao ha novas mensagens;
      - validar que imagens ja exibidas nao piscam ou voltam para estado de carregamento.
    - teste de badge de mensagens no Interfone:
      - enviar mensagem de uma unidade para outra ou da portaria para unidade;
      - entrar na tela Interfone do destinatario;
      - validar badge numerico no botao de mensagem do card correspondente;
      - abrir a conversa e validar que o badge reduz/some depois da leitura.
    - teste de notificacao de mensagem:
      - enviar texto simples;
      - enviar anexo sem legenda;
      - enviar anexo com legenda;
      - validar `app_call_diagnostics.action = message_notification_dispatch`;
      - resultado esperado: `SUCCESS`;
      - `metadata.fcm_token_count` deve ser maior que zero quando o receptor tiver token registrado;
      - receptor em background deve receber notificacao nativa de mensagem;
      - tocar na notificacao deve abrir a aba `Mensagens`.
  - micro-hotfix de foco na conversa 07/06/2026:
    - teste de abertura por botao de mensagem:
      - abrir a tela Interfone;
      - tocar no botao de mensagem de uma unidade ou portaria;
      - validar que a conversa abre no final da lista;
      - validar que o input `Escreva uma mensagem` recebe foco automaticamente.
    - teste de abertura pela lista de conversas:
      - abrir a aba Mensagens;
      - selecionar uma conversa com historico longo;
      - validar que a tela rola para a ultima mensagem;
      - validar que nao e necessario rolar manualmente ate o composer.
  - refatoracao de layout da conversa 07/06/2026:
    - teste de composer fixo:
      - abrir uma conversa com historico longo e imagens;
      - validar que o header da conversa permanece no topo da area de mensagens;
      - validar que apenas a lista de mensagens rola;
      - validar que o campo `Escreva uma mensagem` permanece visivel no rodape da tela de conversa.
    - teste com teclado aberto:
      - abrir a conversa;
      - validar foco automatico no input;
      - validar que o teclado abre sem esconder o composer;
      - digitar uma mensagem longa;
      - validar que a barra inferior do app nao sobrepoe o input.
    - teste de anexo pendente:
      - tocar no clipe;
      - selecionar imagem;
      - validar que o preview do anexo aparece acima do composer;
      - validar que a lista de mensagens continua rolavel independentemente do anexo pendente;
      - enviar o anexo com ou sem legenda e validar que o composer permanece fixo.
