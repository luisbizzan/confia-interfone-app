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
- Documentacao de seguranca inicial.

Pendente dentro da Fase 1:

- Evoluir polling para Supabase Realtime.
- Melhorar labels de origem/destino quando existirem varias unidades e moradores.
- Teste completo de morador para outra unidade com duas unidades reais.

## Proximas fases do app

### Fase 1 - MVP operacional sem voz real

Objetivo: validar login, perfis, chamadas transacionais, historico e estados de chamada.

Status: em andamento, com base funcional pronta.

### Fase 2 - Voz real

Objetivo: integrar audio real entre portaria e moradores.

Escopo previsto:

- Definir provedor/arquitetura de voz.
- Avaliar WebRTC, LiveKit, Daily, Agora ou Twilio.
- Criar sala/sessao de audio por chamada.
- Integrar permissao de microfone.
- Garantir que segredos do provedor fiquem no backend.

### Fase 3 - Notificacoes e background

Objetivo: permitir chamadas recebidas com app em segundo plano.

Escopo previsto:

- Push notifications.
- Firebase Cloud Messaging para Android.
- Apple Push Notification service para iOS.
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
- O backoffice continua sendo responsavel por criar condominios, portaria, unidades e moradores.
