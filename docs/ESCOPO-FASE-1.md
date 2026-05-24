# Confia Interfone App - Controle da Fase 1

## Objetivo da fase

Construir o MVP mobile do Confia Interfone Digital em React Native, validando login, perfis, diretorio de unidades, fluxo de chamada e historico antes da integracao de voz real.

## Stack definida

- React Native com Expo.
- TypeScript.
- Supabase Auth para login.
- Supabase RPCs para regras de negocio.
- `expo-secure-store` para sessao segura no dispositivo.
- `react-native-web` para visualizacao rapida no navegador durante desenvolvimento.

## Perfis do app

- Portaria: usuario criado no onboarding do condominio pelo backoffice, vinculado a `portaria_devices`.
- Morador: usuario criado no fluxo de unidade/morador do backoffice, vinculado a `unit_members`.

O app nao usa login de `ADMIN` ou `CONSULTOR` do backoffice.

## Regras de negocio confirmadas

- A portaria pode ligar para unidades do proprio condominio.
- O morador pode ligar para a portaria do proprio condominio.
- O morador pode ligar para outra unidade/casa do mesmo condominio.
- O morador nao pode ligar para a propria unidade.
- Nenhum usuario pode visualizar ou chamar unidades de outro condominio.
- Permissoes de chamada devem ser validadas no backend:
  - `active_for_calls`
  - `can_receive_calls`
  - `can_make_calls`
  - dispositivo de portaria ativo
- O historico deve registrar origem, destino, status, horario e condominio.

## Entregas implementadas

### 1. Fundacao do app

Commit: `306dd6c Add Confia mobile phase 1 foundation`

- Criado projeto `confia-interfone-app`.
- Criado repositorio GitHub separado do backoffice/backend.
- Criada estrutura inicial:
  - `src/components`
  - `src/config`
  - `src/data`
  - `src/screens`
  - `src/services`
  - `src/theme`
  - `src/types`
  - `docs`
- Criado tema visual inicial do Confia.
- Criadas telas iniciais de morador e portaria com dados demo.
- Criada documentacao inicial de escopo e seguranca.

### 2. Ajuste de compatibilidade Expo

Commit: `81af64e Fix Expo SDK dependency versions`

- Corrigidas versoes de dependencias compativeis com Expo SDK 54.
- Adicionado suporte web:
  - `react-dom`
  - `react-native-web`
- Mantido `expo-secure-store`.
- Validado export web.

### 3. Login real com Supabase

Commit: `61451d2 Add real Supabase app login`

- Substituida selecao simulada de perfil por login real.
- Login com e-mail e senha via Supabase Auth.
- Sessao carregada automaticamente ao abrir o app.
- Logout real.
- Identificacao automatica de perfil pelo RPC `get_current_user_context`.
- Direcionamento automatico:
  - role `MORADOR` -> tela de morador
  - role `PORTARIA` -> tela de portaria
- Carregamento do nome do condominio.
- Carregamento do diretorio de unidades via RLS.
- Uso de `.env` com:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 4. Conexao dos botoes de chamada

Commit app: `d046538 Connect app call actions to backend`

Commit backend relacionado: `2833dca Add unit to unit call RPC`

- Conectado botao da portaria:
  - `start_portaria_call`
- Conectado botao do morador para portaria:
  - `start_unit_to_portaria_call`
- Criada e aplicada no backend a RPC:
  - `start_unit_to_unit_call`
- Conectado botao do morador para outra unidade:
  - `start_unit_to_unit_call`
- Protegido `.env` local no `.gitignore`.

### 5. Estados e feedback dos botoes

Commit: `67d94c4 Clarify resident call button states`

- Botao de morador para propria unidade passa a ficar desabilitado.
- Texto em tela explica que e necessario criar outra unidade para testar chamada entre casas.
- Botao de chamada mostra feedback em tela:
  - chamando
  - chamada iniciada
  - erro retornado pelo backend
- Botao `PrimaryButton` passou a aceitar `disabled`.

### 6. Historico real de chamadas

Commit: `7204a4f Load real call history in app`

- Conectado app ao RPC:
  - `get_my_call_history`
- Morador ve historico real de chamadas.
- Portaria ve historico real de chamadas.
- Botao `Ver historico` virou `Atualizar historico`.
- Contador `Tocando` da portaria passou a usar chamadas reais carregadas.
- Removido uso do historico demo nas telas principais.

### 7. Chamadas pendentes e atendimento

Commit: `Add pending call handling`

- Conectado app ao RPC:
  - `get_my_pending_calls`
- Morador passa a ver chamadas tocando para sua unidade.
- Portaria passa a ver chamadas tocando para a portaria.
- Morador pode atender chamada recebida via:
  - `answer_call`
- Portaria pode atender chamada recebida via:
  - `answer_portaria_call`
- Historico com chamadas em `RINGING` passa a exibir acao de cancelamento via:
  - `cancel_call`
- Atualizacao manual agora recarrega historico e chamadas pendentes.

### 8. Chamada em andamento e encerramento

Commit: `30b6249 Add active call end flow`

- Backend ajustado para manter chamadas atendidas abertas:
  - `answer_call` grava `status = ANSWERED`, `answered_at` e mantem `ended_at = null`.
  - `answer_portaria_call` segue o mesmo comportamento.
- App passa a identificar chamada em andamento quando:
  - `status = ANSWERED`
  - `ended_at = null`
- Morador ve painel `Chamada em andamento`.
- Portaria ve painel `Chamada em andamento`.
- App passa a exibir botao:
  - `Encerrar chamada`
- Encerramento usa o RPC:
  - `end_call`

### 9. Atualizacao automatica de chamadas

Commit: `Add automatic call refresh`

- Morador passa a atualizar historico e chamadas pendentes automaticamente a cada 5 segundos.
- Portaria passa a atualizar historico e chamadas pendentes automaticamente a cada 5 segundos.
- Quando a portaria atende uma chamada iniciada pelo morador, a tela do morador passa a refletir o status `ANSWERED` sem exigir clique em `Atualizar chamadas`.
- A tela de `Chamada em andamento` aparece automaticamente para as duas pontas depois da proxima atualizacao.
- Esta solucao usa polling curto como etapa intermediaria da Fase 1.
- Supabase Realtime continua previsto como evolucao posterior.

### 10. Diretorio de unidades com disponibilidade real

Commit: `Add operational unit directory`

- App passa a carregar unidades junto com `unit_members`.
- Cada unidade passa a informar se tem morador ativo apto a receber chamadas.
- Botao `Chamar unidade` so fica habilitado quando existe pelo menos um morador ativo com:
  - `active_for_calls = true`
  - `can_receive_calls = true`
- Lista de unidades passa a mostrar:
  - quantidade de moradores ativos;
  - ou mensagem `Sem morador ativo para chamadas`.
- Isso reduz erros de backend ao tentar ligar para unidade sem morador disponivel.

## Contratos de backend usados pelo app

- `get_current_user_context()`
- `get_my_call_history(p_limit)`
- `get_my_pending_calls()`
- `start_portaria_call(p_unit_id)`
- `start_unit_to_portaria_call(p_unit_id)`
- `start_unit_to_unit_call(p_origin_unit_id, p_target_unit_id)`
- `answer_call(p_call_id, p_user_id)`
- `answer_portaria_call(p_call_id)`
- `cancel_call(p_call_id, p_reason)`
- `end_call(p_call_id, p_reason)`

## Fluxos validados

### Login portaria

- Usuario de portaria criado no backoffice consegue logar no app.
- App identifica role `PORTARIA`.
- App carrega condominio vinculado.
- App mostra dispositivo da portaria.
- App lista unidades do condominio.

### Login morador

- Usuario morador criado no backoffice consegue logar no app.
- App identifica role `MORADOR`.
- App carrega unidade vinculada.
- App lista unidades do condominio.
- App bloqueia chamada para a propria unidade.

### Chamada

- Morador consegue iniciar chamada para portaria.
- Portaria consegue iniciar chamada para unidade.
- Morador para outra unidade esta implementado, mas exige ao menos duas unidades com moradores ativos no mesmo condominio para teste completo.

### Historico

- Historico real e carregado pelo app.
- Chamadas criadas aparecem apos atualizar historico.

### Pendentes e atendimento

- Morador ve chamadas recebidas em aberto.
- Portaria ve chamadas recebidas em aberto.
- Morador consegue atender chamada recebida.
- Portaria consegue atender chamada recebida.
- Chamadas tocando podem ser canceladas pelo originador quando permitido pelo backend.

### Chamada em andamento

- Chamadas atendidas aparecem como em andamento enquanto `ended_at` estiver vazio.
- Morador consegue encerrar chamada em andamento.
- Portaria consegue encerrar chamada em andamento.

## Seguranca da Fase 1

- App usa apenas chave publica do Supabase.
- App nao contem `service_role_key`.
- App nao contem `ADMIN_API_SECRET`.
- App nao contem segredos do backoffice.
- Arquivo `.env` local esta ignorado pelo Git.
- Regras sensiveis ficam no backend, via RPC.
- Perfis e permissoes sao validados pelo backend.
- Sessao mobile usa armazenamento seguro quando fora do web.

## Configuracao local

Arquivo:

```text
.env
```

Conteudo:

```text
EXPO_PUBLIC_SUPABASE_URL=https://uvdwoisdcikzhqjwbhog.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-ou-anon-key>
```

Rodar:

```powershell
npm install
npx expo start -c
```

Validar:

```powershell
npm run typecheck
npx expo export --platform web --output-dir .tmp-web-export
```

## Status da Fase 1

Status: em construcao avancada.

Concluido:

- Setup do app.
- Login real.
- Identificacao de perfil.
- Telas iniciais por perfil.
- Diretorio de unidades.
- Acoes de chamada via backend.
- Historico real de chamadas.
- Chamadas pendentes.
- Atendimento de chamadas recebidas.
- Cancelamento de chamadas tocando.
- Painel de chamada em andamento.
- Encerramento explicito via `end_call`.
- Atualizacao automatica por polling.
- Diretorio de unidades com disponibilidade real para chamadas.
- Documentacao de seguranca inicial.

Pendente dentro da Fase 1:

- Evoluir polling para Supabase Realtime.
- Teste completo de morador para outra unidade com duas unidades reais.

## Proximas fases do app

### Fase 1 - MVP operacional sem voz real

Objetivo: validar login, perfis, chamadas transacionais, historico e estados de chamada.

Status: em andamento, com base funcional pronta.

### Fase 2 - Voz real

Objetivo: integrar audio real entre portaria e moradores.

Provedor escolhido: LiveKit Cloud.

Status: iniciada.

Entregas iniciadas:

- Dependencias LiveKit instaladas no app:
  - `@livekit/react-native`
  - `@livekit/react-native-expo-plugin`
  - `@livekit/react-native-webrtc`
  - `@config-plugins/react-native-webrtc`
  - `livekit-client`
  - `expo-dev-client`
- Expo configurado com plugins nativos do LiveKit/WebRTC.
- Permissoes de microfone configuradas para Android e iOS.
- Backend passa a ter a Edge Function `livekit-token`.
- Projeto LiveKit Cloud `confia-interfone` criado.
- Secrets do LiveKit cadastradas no Supabase:
  - `LIVEKIT_URL`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
- App passa a solicitar token temporario de voz pelo `call_id`.
- LiveKit e registrado no bootstrap do app com `registerGlobals()`.
- Painel de chamada em andamento passa a ter acao `Entrar no audio`.
- Depois do token, o app conecta a sala LiveKit com:
  - audio publicado;
  - video desabilitado;
  - sessao de audio nativa durante a chamada.
- Sala conectada passa a exibir estado de conexao e controle:
  - `Mutar microfone`;
  - `Ativar microfone`.
- Integracao LiveKit foi separada por plataforma:
  - Android/iOS carregam WebRTC nativo, audio real e controles de microfone;
  - web continua validando token e fluxo transacional sem carregar modulo nativo.
- EAS Build foi preparado para gerar APK Android interno:
  - `eas.json` com perfil `development`;
  - `developmentClient = true`;
  - `distribution = internal`;
  - `android.buildType = apk`.
- Identificador Android definido para o app:
  - `br.com.confia.interfone`.
- Projeto vinculado ao EAS:
  - conta `luisbizzan`;
  - projeto `@luisbizzan/confia-interfone-app`;
  - `projectId` salvo no `app.json`.
- Primeira tentativa de build APK chegou ao Gradle e revelou incompatibilidade do development client:
  - `expo-dev-client@55` puxava `expo-dev-menu` incompatível com Expo SDK 54;
  - dependencia corrigida para a versao esperada pelo SDK 54:
    - `expo-dev-client@~6.0.21`.
- Segunda build EAS Android de desenvolvimento concluida com sucesso:
  - build `a1f446c8-a1f4-4014-b227-f53d17c1d917`;
  - artefato interno disponivel para instalar o development build no Android;
  - proximo teste nativo passa a ser abrir o app no aparelho e validar chamada com audio LiveKit entre duas sessoes.
- Primeiro teste Android com dois apps instalados confirmou que o tunel LiveKit conecta as duas pontas.
- Feedback do primeiro uso real do morador:
  - o audio nao deve exigir um segundo toque em `Entrar no audio` depois do atendimento;
  - a chamada deve migrar automaticamente para a tela de ligacao quando a outra ponta atender;
  - a experiencia visual deve se aproximar de uma ligacao do WhatsApp;
  - o toque de chamada recebida ainda precisa existir;
  - a rota de audio Android precisa ser revista, pois o teste saiu em viva-voz em vez de fone do aparelho;
  - a lista de unidades deve ficar mais enxuta, com acao de ligar por icone.
- Primeiro ajuste de UX de ligacao aplicado no app:
  - chamada recebida agora abre experiencia focada de atendimento;
  - chamada originada em `RINGING` agora abre experiencia focada de espera/cancelamento;
  - chamada em `ANSWERED` agora abre experiencia focada de chamada em andamento;
  - o audio LiveKit passa a preparar a conexao automaticamente na chamada atendida;
  - o historico deixou de ficar exposto na home e agora abre por acao explicita;
  - a home do morador passou a destacar ligacao para portaria em acao compacta;
  - listas de unidades de morador e portaria ficaram mais compactas e usam acao circular de telefone;
  - chamadas para unidade atualizam o estado imediatamente depois da criacao para abrir a tela de espera sem aguardar o proximo polling;
  - sessao de audio LiveKit passa a priorizar earpiece/fone no Android e saida de earpiece no iOS.
- Refinamento visual depois da revisao no aparelho:
  - acao de ligar deixou de usar glifo/emoji do Android e passou a usar icone vetorial do Expo;
  - a propria unidade do morador saiu da lista de destinos para deixar a tela mais limpa;
  - tela de chamada passou a usar superficie imersiva escura e ocultar o nome tecnico da sala LiveKit;
  - controles da chamada passaram a ficar concentrados na area inferior;
  - controle de saida de audio permite alternar entre fone e viva-voz quando a conexao LiveKit estiver pronta.
  - cabecalho no Android ganhou respiro da barra de status para nao sobrepor os indicadores do aparelho.
  - tela de chamada originada deixou de expor o botao tecnico `Atualizar estado`, mantendo apenas espera automatica e cancelamento.
- Evolucao modular do app aplicada:
  - app passou a abrir em uma home principal depois do login;
  - Interfone virou um atalho/recurso da home, preparando o app para novas funcionalidades futuras;
  - navegacao inferior adicionada com `Inicio`, `Interfone` e `Configuracoes`;
  - tela de configuracoes mostra perfil logado e recursos disponiveis para o condominio;
  - contrato do app passa a ler `context.features` retornado pelo backend;
  - recurso inicial `INTERCOM` controla se o atalho do interfone aparece;
  - quando `INTERCOM = false`, o app nao oferece entrada operacional no interfone;
  - por compatibilidade, se `features` ainda nao vier do backend antigo, o app trata o interfone como habilitado.
- Alerta de chamada recebida aplicado:
  - chamada recebida passa a tocar um arquivo local `incoming-call.wav`;
  - no Android, a chamada recebida tambem vibra em repeticao enquanto a tela de recebimento estiver aberta;
  - ao atender, cancelar, sair da tela ou deixar de receber a chamada, o toque e a vibracao sao interrompidos;
  - `expo-audio` foi adicionado ao app para tocar o alerta local;
  - permissao Android `android.permission.VIBRATE` foi adicionada.
- Evolucao do backend/backoffice relacionada:
  - criada tabela `condominium_features`;
  - condominios existentes recebem `INTERCOM = true`;
  - cadastro de novo condominio no backoffice ganhou checkbox `Habilitar Interfone Digital neste condominio`;
  - criacao de chamadas passa a ser bloqueada pelo banco se `INTERCOM` estiver desabilitado;
  - leituras administrativas e `get_current_user_context()` passam a retornar o mapa de recursos.
- Observabilidade de erros - Fase 1:
  - criada captura global de excecoes JavaScript no app;
  - criada `AppErrorBoundary` para erros de renderizacao React;
  - usuario passa a ver tela amigavel informando que o erro foi reportado ao time tecnico;
  - relatorios sao enviados para a tabela `app_error_reports` no Supabase;
  - relatorio inclui mensagem, stacktrace, component stack, rota atual, plataforma, versao do app, usuario, perfil, condominio e metadados sanitizados;
  - tokens, senhas e segredos sao removidos dos metadados antes do envio;
  - falhas no proprio envio do relatorio nao geram novo erro para o usuario.
- Observabilidade de erros - Fase 2:
  - app passa a enviar relatorios para a Edge Function `report-app-error`;
  - a Edge Function autentica o usuario, grava o relatorio e gera assinatura de deduplicacao;
  - quando `GITHUB_TOKEN` e `GITHUB_REPOSITORY` estiverem configurados no Supabase, a funcao cria issue no GitHub;
  - erros repetidos usam a mesma assinatura e reaproveitam a issue existente;
  - se o GitHub ainda nao estiver configurado, o relatorio fica salvo no Supabase e a resposta marca `github.status = skipped`;
  - o app mantem fallback de insert direto na tabela caso a Edge Function esteja indisponivel.
- Simulador controlado de erro:
  - adicionada flag `EXPO_PUBLIC_ENABLE_ERROR_TEST`;
  - quando a flag vale `true`, a tela `Configuracoes` exibe o botao `Gerar erro de teste`;
  - o botao provoca uma excecao de renderizacao controlada para validar o fluxo completo de reporte;
  - a flag deve ficar `false` em builds de cliente/piloto externo.
- Preparacao de APK independente do Metro:
  - identificado que o APK `development` exige Metro ativo e QR apontando para a maquina local;
  - criado ambiente `preview` no EAS com `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` e `EXPO_PUBLIC_ENABLE_ERROR_TEST=true`;
  - primeira build `preview` falhou no Hermes por incompatibilidade do `@supabase/supabase-js@2.106.0` com `import(/* webpackIgnore */ ...)` de tracing/OpenTelemetry;
  - dependencia `@supabase/supabase-js` foi travada em `2.86.0`, mantendo Auth, RPC e Edge Functions sem o trecho de tracing problematico;
  - export Android local com Hermes passou depois da correcao.
- Correcao de crash nativo no APK `preview`:
  - primeiro APK preview instalou, mas abriu a tela nativa de feedback com `NoClassDefFoundError: expo.modules.kotlin.types.AnyTypeCache`;
  - causa identificada: `expo-audio` estava resolvendo peer dependencies para `expo-asset@56.x` e `expo-constants@56.x`, incompatíveis com Expo SDK 54;
  - `expo-asset` e `expo-font` foram adicionados explicitamente na versao compativel com SDK 54;
  - arvore nativa passou a ficar alinhada em `expo-asset@12.0.13`, `expo-font@14.0.11`, `expo-constants@18.0.13` e `expo-modules-core@3.0.30`;
  - `expo install --check`, `tsc --noEmit` e `expo export --platform android` passaram depois da correcao.
- Correcao de variaveis publicas no APK `preview`:
  - APK corrigido abriu, mas exibiu aviso de Supabase nao configurado;
  - variaveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` existiam no ambiente `preview` do EAS;
  - causa identificada: o perfil `preview` do `eas.json` nao declarava `environment = preview`;
  - perfil `preview` passou a carregar explicitamente o ambiente `preview` para injetar as variaveis publicas no bundle.
- Correcao complementar de injecao de ambiente:
  - `app.json` nao expande valores no formato `$EXPO_PUBLIC_*` dentro de `extra`;
  - criado `app.config.js` para ler `process.env` durante o build e gravar valores reais em `extra`;
  - `env.ts` passou a priorizar `Constants.expoConfig.extra`, mantendo `process.env` apenas como fallback;
  - `expo config --type public` confirmou `supabaseUrl`, `supabaseAnonKey` e `enableErrorTest` resolvidos antes do build.
- Monitor global de chamadas com app aberto:
  - criado monitor de chamadas no nivel raiz do app para quando o usuario estiver logado e fora da tela `Interfone`;
  - Home e Configuracoes passam a detectar chamadas recebidas por polling curto;
  - chamada recebida fora da tela Interfone abre a mesma experiencia focada de atendimento, com toque e vibracao;
  - chamada atendida fora da tela Interfone passa a abrir a mesma tela de chamada em andamento e conectar o audio LiveKit;
  - chamadas originadas ainda em `RINGING` tambem aparecem como tela de espera/cancelamento quando detectadas pelo monitor global;
  - quando o usuario entra na aba Interfone, o monitor global pausa para evitar duplicidade com o fluxo operacional da propria tela.
- APK preview instalado no aparelho conectado:
  - build EAS Android `c705c3dc-34db-4f60-956c-a0ea26bb0fd9`;
  - commit embarcado `3ae6a64 Monitor calls outside intercom screen`;
  - artefato `https://expo.dev/artifacts/eas/qzqaCrngGphC281p7hZV5n.apk`;
  - instalado via ADB no dispositivo `SM-N981B`;
  - abertura inicial validada por logcat sem `FATAL EXCEPTION`, `AndroidRuntime` ou crash de modulo nativo.
- Regra de ocupacao aplicada no backend:
  - migration `20260523130500_block_busy_call_targets.sql` aplicada no Supabase remoto;
  - nova chamada para portaria e bloqueada quando a portaria ja estiver em `RINGING` ou `ANSWERED` sem `ended_at`;
  - nova chamada para unidade e bloqueada quando a unidade ja estiver em `RINGING` ou `ANSWERED` sem `ended_at`;
  - origem tambem fica protegida: unidade ou portaria em atendimento nao inicia outra chamada;
  - app recebe mensagens amigaveis do backend para exibir ao usuario.
- APK preview para teste com tres celulares:
  - build EAS Android `e15d1dcc-8ce6-4587-bd73-e001a95ce137`;
  - commit embarcado `73ff0d7 Document busy call target rule`;
  - artefato `https://expo.dev/artifacts/eas/tQ5krp8VidvgyVhsA8TB62.apk`;
  - instalado via ADB no dispositivo conectado `SM-N981B`;
  - abertura inicial validada por logcat sem crash fatal.
- Diagnostico operacional para testes com multiplos celulares:
  - criada tabela backend `app_call_diagnostics`;
  - app passa a registrar eventos de chamada com `STARTED`, `SUCCESS` e `ERROR`;
  - eventos incluem usuario, perfil, condominio, plataforma, acao, `call_id`, unidades envolvidas, duracao da RPC e mensagem de erro;
  - falhas de chamada passam a aparecer em popup com botao `OK`, deixando bloqueios de portaria/unidade ocupada mais visiveis;
  - feedback inline de erro deixa de poluir cards incorretos, como a mensagem de chamada para unidade aparecendo dentro do card da portaria.
- APK preview com diagnosticos e popups:
  - build EAS Android `78bd6c9f-1f1b-4a3f-911f-06dba4f903c3`;
  - commit embarcado `79c74d6 Add call diagnostics and popup errors`;
  - artefato `https://expo.dev/artifacts/eas/fUKuVBm5TsRJTFGVYEpysF.apk`;
  - APK baixado e validado como arquivo integro;
  - instalacao ADB ficou pendente porque nenhum dispositivo estava conectado/autorizado no momento da instalacao.

Regras de seguranca:

- O app nao armazena `LIVEKIT_API_SECRET`.
- Tokens de voz sao emitidos pelo backend.
- Token so deve ser emitido para chamada com `status = ANSWERED` e `ended_at = null`.
- Usuario precisa participar da chamada como morador ou portaria.
- Sala LiveKit usa o padrao `confia-call-<call_id>`.

Observacao tecnica:

- LiveKit em Expo exige development build com `expo-dev-client`.
- Expo Go nao suporta os modulos nativos de WebRTC exigidos pelo LiveKit.
- A visualizacao web continua util para login, chamadas, atendimento e validacao de token.
- Builds `development` servem para depurar com Metro/QR; builds `preview` geram APK instalavel que abre sem depender do servidor local.
- A dependencia `@supabase/supabase-js` deve permanecer fixa em `2.86.0` ate validarmos uma versao mais nova compativel com Hermes.

Escopo previsto restante:

- Sair da sala ao chamar `end_call`.
- Validar em development build Android.
- Validar audio real entre duas sessoes com morador e portaria.
- Refinar UX de chamada:
  - validar no aparelho a conexao automatica do audio depois do atendimento;
  - validar no aparelho a tela dedicada para tocando, recebendo e em chamada;
  - feedback sonoro de chamada recebida;
  - evoluir feedback de reconexao/erro sem expor detalhes tecnicos.
- Validar roteamento de audio nativo com prioridade para o fone do aparelho no uso comum.
- Evoluir UX de reconexao/erro depois do primeiro teste nativo.
- Gerar novo APK `preview` depois da correcao do Supabase JS para testar sem Metro/QR.
- Testar recurso `INTERCOM = false` em um condominio novo para validar home sem atalho de interfone.
- Validar em device real a tela amigavel de erro e a gravacao em `app_error_reports`.
- Configurar secrets `GITHUB_TOKEN` e `GITHUB_REPOSITORY` no Supabase para ativar criacao real de issues.
- Validar deduplicacao criando duas ocorrencias do mesmo erro e conferindo que a issue e reaproveitada.
- Para teste manual do simulador, iniciar o app com `EXPO_PUBLIC_ENABLE_ERROR_TEST=true`.
- Validar em dois aparelhos que chamada recebida toca e abre a tela de atendimento quando o destinatario esta na Home ou em Configuracoes.
- Validacao com 3 aparelhos em 23/05/2026:
  - logs `app_call_diagnostics` confirmaram chamadas reais entre A-1, A-2 e portaria;
  - bloqueios de destino ocupado retornaram corretamente pela RPC;
  - foi identificado vazamento de estado na UI quando o historico trazia chamadas do condominio que nao pertenciam ao perfil logado;
  - corrigido no app para considerar apenas chamadas relevantes ao morador ou ao dispositivo de portaria logado;
  - corrigido no backend para `get_my_call_history` retornar chamadas da unidade do morador ou do dispositivo de portaria, sem misturar chamadas internas de outros participantes.
  - build EAS Android `b886f035-a84c-4a27-884c-ec2edf68826a`;
  - commit embarcado `204de85 Scope active call state to logged user`;
  - artefato `https://expo.dev/artifacts/eas/oMAKKK1r6eqNqqjcgUcCW7.apk`;
  - APK baixado e validado como arquivo integro;
  - instalacao ADB nao executada porque nenhum dispositivo estava conectado/autorizado no momento da verificacao.
  - analise visual dos videos confirmou pontos adicionais de UX:
    - login precisava se adaptar melhor ao teclado no celular;
    - remover botao manual `Atualizar` da tela de chamada recebida;
    - trocar feedback pos-encerramento para mensagem amigavel sem `Status: ANSWERED`;
    - abrir tela cheia de `Chamando` imediatamente apos a RPC criar uma chamada, antes do proximo polling;
    - manter popup para ocupado, pois ficou mais visivel no teste real.
  - build EAS Android com refinamentos dos videos `dd8556ac-bed0-4778-abf8-1b49547bb562`;
  - commit embarcado `14c1f94 Refine call UX from device videos`;
  - artefato `https://expo.dev/artifacts/eas/tmxZSDx6kN4WCcQPsaZC4L.apk`;
  - APK baixado e validado como arquivo integro.
  - login ajustado com `KeyboardAvoidingView`, scroll e envio pelo teclado para melhorar uso em aparelhos Android/iOS.
  - build EAS Android com login ajustado `842568a1-3395-4ffe-a8bc-f449de4eea2b`;
  - commit embarcado `f7ec26c Improve login keyboard handling`;
  - artefato `https://expo.dev/artifacts/eas/hjrDdR8wRD6rTahzeMST9P.apk`;
  - APK baixado e validado como arquivo integro;
  - instalacao ADB nao executada porque nenhum dispositivo apareceu em `adb devices`.
  - ajustes adicionais apos teste de 23/05/2026:
    - tela de Configuracoes passa a exibir versao instalada e build;
    - login usa modo Android `softwareKeyboardLayoutMode = resize`, reposiciona o card quando o teclado abre e registra erros inesperados;
  - lista de unidades passa a consultar chamadas ativas do condominio para exibir `Em atendimento` quando uma unidade esta ocupada;
  - erros inesperados de cancelar/encerrar chamada passam a ter mensagem amigavel e reporte tecnico.
  - build EAS Android com disponibilidade, mensagens amigaveis e versao em Configuracoes `4ac99f56-0865-4ecb-87ca-1d0715d66254`;
  - commit embarcado `8c6a7f6 Improve app call availability and diagnostics UX`;
  - artefato `https://expo.dev/artifacts/eas/aeCQUFg9bR5Zh9723Ftutw.apk`;
  - APK baixado e validado como arquivo integro em `confia-interfone-preview-8c6a7f6.apk`;
  - instalacao ADB nao executada porque nenhum dispositivo apareceu em `adb devices`;
  - `versionCode` foi elevado para `8` no commit seguinte `40959fd`, mas o novo build EAS ficou pendente por limite mensal do plano Free, com reset informado para 01/06/2026.

### Atualizacoes do app

Estrategia definida:

- durante o piloto, cada APK validado fica documentado nesta fase com link, commit e build EAS;
- na publicacao oficial, a atualizacao principal sera feita pela Google Play/App Store;
- antes de publicar, implementar verificacao de versao minima no backend para bloquear versoes antigas com mensagem amigavel;
- avaliar `expo-updates`/EAS Update apenas para ajustes JS seguros, sem substituir revisao de loja quando houver mudanca nativa.

### Fase 3 - Notificacoes e background

Objetivo: permitir chamadas recebidas com app em segundo plano.

Implementado em 23/05/2026:

- Dependencias nativas:
  - `expo-notifications`;
  - `expo-device`.
- App solicita permissao de notificacao em aparelho fisico depois do login.
- App cria o canal Android `incoming-calls` com som, vibracao e prioridade alta.
- App registra o `ExpoPushToken` no Supabase via RPC `register_app_push_token`.
- Logout desativa o token atual via RPC `unregister_app_push_token`.
- Quando o usuario toca numa notificacao de chamada, o app abre a area de Interfone.
- Ao criar uma chamada, o app aciona a Edge Function `send-call-notification` em modo best effort.
- Tela de Configuracoes mostra o status de notificacoes do aparelho: registrando, token registrado, indisponivel neste aparelho/build ou erro.
- App grava diagnosticos `push_registration` em `app_call_diagnostics`.
- Backend guarda tokens em `app_push_tokens`.
- Edge Function `send-call-notification` localiza destinatarios por chamada:
  - chamada para portaria: usuario do `target_portaria_device_id`;
  - chamada para unidade: morador da tentativa atual em `call_attempts`;
  - o usuario iniciador nao recebe a propria notificacao.
- Edge Function grava diagnosticos `push_notification_dispatch` em `app_call_diagnostics`, incluindo ausencia de token, quantidade de tokens enviados, tickets retornados pelo Expo ou erro de envio.
- Bundle Android validado com `expo export --platform android`.
- Em teste real com app em background, nao houve notificacao visual; a instrumentacao acima foi adicionada para separar problema de token, envio Expo ou credencial Android/FCM.
- Diagnostico de 24/05/2026 confirmou que o APK local nao consegue registrar token Android por falta de Firebase/FCM nativo:
  - erro capturado em `app_error_reports.source = push-registration`;
  - mensagem tecnica: `Default FirebaseApp is not initialized`;
  - acao necessaria: configurar FCM V1/`google-services.json` no projeto Expo/EAS antes de validar push em background.
- Configuracao Firebase Android adicionada em 24/05/2026:
  - pacote Android registrado no Firebase: `br.com.confia.interfone`;
  - arquivo `google-services.json` adicionado ao app;
  - `app.json` passa a usar `android.googleServicesFile`;
  - `expo prebuild` confirmou `com.google.gms:google-services` no Gradle e `android/app/google-services.json`;
  - APK local gerado: `C:\Projetos\Confia\apks\confia-interfone-firebase-20260524.apk`;
  - instalacao via ADB ficou pendente porque nenhum device estava visivel/autorizado.

Pendencias de conta/build:

- Para APK/loja receber push real, o projeto Expo/EAS precisa ter credenciais de push configuradas:
  - Android: FCM V1;
  - iOS: APNs.
- EAS Free atingiu o limite mensal; novo build em nuvem fica bloqueado ate o reset informado para 01/06/2026.
- Build local Android foi configurado no Windows com Android SDK, NDK, CMake e JDK 17 portatil.
- APK local gerado com sucesso:
  - caminho: `C:\Projetos\Confia\apks\confia-interfone-push-local-20260523.apk`;
  - origem: `android\app\build\outputs\apk\release\app-release.apk`;
  - tamanho aproximado: 142 MB.
- Tentativa de instalar via ADB nao encontrou aparelho conectado/autorizado no momento do build; o APK ficou disponivel para instalacao manual.
- APK local com diagnosticos de push gerado apos o teste sem notificacao em background:
  - caminho: `C:\Projetos\Confia\apks\confia-interfone-push-diagnostics-20260523.apk`;
  - inclui status de token em Configuracoes e logs `push_registration`/`push_notification_dispatch`;
  - nova tentativa de instalar via ADB tambem nao encontrou aparelho conectado/autorizado.

Escopo ainda previsto:

- Validar recebimento real de push em aparelho fisico com APK novo.
- Validar em Configuracoes se o aparelho mostra `Token registrado`.
- Validar em `app_call_diagnostics` se aparecem eventos `push_registration` e `push_notification_dispatch`.
- Se `Token registrado` funcionar mas o push nao chegar, proximo passo e configurar credencial FCM V1 do lado servidor/Expo para envio via Expo Push Service.
- Tratar receipts do Expo Push Service para desativar tokens invalidos automaticamente.
- Avaliar CallKit no iOS.
- Avaliar ConnectionService no Android.
- Beta fechado/TestFlight/internal testing.

### Fase 4 - Publicacao oficial e hardening

Objetivo: preparar app para lojas oficiais e uso piloto.

Escopo previsto:

- Politica de privacidade.
- Data Safety do Google Play.
- App Privacy da Apple.
- Conta Apple Developer.
- Conta Google Play Console.
- Monitoramento de erros.
- Revisao LGPD.
- Checklist de permissao de microfone/notificacao.
- Build de producao com EAS.

## Observacoes importantes

- O app ainda nao tem voz real; as chamadas atuais sao estados transacionais no backend.
- O historico e as chamadas pendentes atualizam automaticamente por polling curto na Fase 1.
- Para testar chamada entre moradores, e necessario cadastrar uma segunda unidade com morador ativo no backoffice.
- O app ja bloqueia unidades sem morador ativo para receber chamadas.
- O backoffice continua sendo responsavel por criar condominios, portaria, unidades e moradores.
- A partir da validacao com 3 aparelhos, o estado visual de `RINGING`/`ANSWERED` precisa ser sempre derivado de chamadas em que o usuario logado participa; historico amplo do condominio fica restrito ao backoffice.
