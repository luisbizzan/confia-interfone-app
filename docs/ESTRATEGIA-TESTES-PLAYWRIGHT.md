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
