# Preparacao Google Play - Confia System

## Posicionamento

Nome recomendado: **Confia System**

Alternativas:
- **Confia Monitoramento**
- **Confia Segurança**
- **Confia Conecta**
- **Confia Access**

Recomendacao: usar **Confia System** como marca principal porque comporta interfone digital, controle de acesso, monitoramento, alertas, portaria, cameras, ocorrencias e futuras integracoes sem prender o produto a uma unica feature.

Paleta inicial:
- Azul principal: `#0B4EA2`
- Azul claro: `#1267C9`
- Vermelho de alerta/conexao: `#E1272D`
- Branco: `#FFFFFF`
- Texto escuro: `#0B1F3A`

Arquivos de marca criados:
- `assets/confia-system-logo.svg`
- `assets/confia-system-mark.svg`

## Dados para cadastro

Nome do app:
Confia System

Categoria sugerida:
Casa e lar, Ferramentas ou Produtividade. Para condominio/portaria, eu comecaria por **Casa e lar** se o foco for morador, ou **Ferramentas** se o foco for operacional/administrativo.

Descricao curta, ate 80 caracteres:
Monitore acessos, interfone e seguranca do seu ambiente em um so app.

Descricao curta alternativa:
Controle interfone, acessos e alertas de seguranca em tempo real.

Descricao longa:
O Confia System centraliza recursos de monitoramento e comunicacao para ambientes residenciais, comerciais e condominiais.

Com o app, moradores, administradores e equipes autorizadas podem acompanhar eventos importantes, receber alertas e acessar funcionalidades de seguranca em uma experiencia simples e organizada.

Nesta primeira versao, o Confia System traz o interfone digital como recurso principal, permitindo chamadas entre portaria e usuarios autorizados com notificacoes no celular. A plataforma foi pensada para evoluir com novos modulos, como controle de acesso, monitoramento de cameras, historico de eventos, avisos, ocorrencias e integracoes com sistemas de seguranca.

Principais recursos:
- Interfone digital pelo celular.
- Notificacoes de chamadas e eventos relevantes.
- Experiencia focada em ambientes monitorados.
- Base preparada para novos modulos de seguranca e gestao.
- Acesso restrito a usuarios autorizados.

O Confia System foi criado para tornar a rotina de acesso e monitoramento mais pratica, conectada e confiavel.

## Screenshots sugeridas

Criar no minimo 4 imagens para a Play Store:
- Tela de login/acesso autorizado.
- Tela de chamada de interfone recebida.
- Tela de chamada em andamento.
- Tela de historico/status/monitoramento ou dashboard.

Textos curtos para sobrepor nas screenshots:
- Interfone digital no celular
- Atenda chamadas com seguranca
- Alertas importantes em tempo real
- Uma base para todo o monitoramento

## Politica de privacidade - rascunho

Titulo:
Politica de Privacidade - Confia System

Texto base:
A presente Politica de Privacidade descreve como o Confia System coleta, usa, armazena e protege informacoes relacionadas ao uso do aplicativo.

O Confia System e um aplicativo voltado a comunicacao, monitoramento e seguranca de ambientes autorizados. O acesso ao aplicativo pode depender de cadastro, convite, autorizacao de administradores ou vinculo com uma organizacao, condominio, empresa ou ambiente monitorado.

Dados que podem ser coletados:
- Dados de conta, como nome, identificador de usuario, e-mail ou telefone, quando necessarios para autenticacao e liberacao de acesso.
- Dados tecnicos do dispositivo, como identificadores de instalacao, sistema operacional, versao do app e tokens de notificacao.
- Dados de uso do app, como registros de chamadas, eventos de notificacao, status de conexao e logs tecnicos necessarios para funcionamento e suporte.
- Audio durante chamadas de interfone, quando o usuario utiliza recursos de comunicacao por voz.
- Camera e microfone, quando forem necessarios para funcionalidades de chamada, comunicacao ou monitoramento autorizadas.

Finalidades de uso:
- Permitir autenticacao e acesso seguro ao aplicativo.
- Viabilizar chamadas de interfone digital e comunicacao em tempo real.
- Enviar notificacoes relacionadas a chamadas, alertas e eventos do sistema.
- Melhorar estabilidade, seguranca e desempenho do app.
- Prestar suporte tecnico e investigar falhas.

Compartilhamento:
Os dados podem ser processados por provedores de infraestrutura, autenticacao, notificacoes, comunicacao em tempo real e armazenamento, sempre de acordo com as finalidades do aplicativo. O Confia System nao vende dados pessoais.

Seguranca:
Adotamos medidas tecnicas e organizacionais para proteger as informacoes contra acesso nao autorizado, perda, uso indevido ou alteracao indevida.

Retencao:
Os dados sao mantidos pelo tempo necessario para cumprir as finalidades descritas nesta politica, exigencias legais, auditoria, seguranca e operacao do servico.

Direitos do usuario:
O usuario pode solicitar informacoes, correcao, exclusao ou revisao de seus dados pessoais, conforme a legislacao aplicavel.

Contato:
Para duvidas sobre privacidade, entre em contato pelo e-mail: [inserir e-mail de privacidade/suporte].

Ultima atualizacao: [inserir data].

Observacao: este texto deve ser revisado conforme a empresa responsavel, provedores usados, dados efetivamente coletados, base legal LGPD e politica final de retencao.

## Data Safety - sugestao inicial

Preencher somente conforme o comportamento real do app e SDKs usados. Pelo app atual, a declaracao provavelmente inclui:

Dados coletados:
- Informacoes pessoais: nome, e-mail ou telefone, se usados no cadastro/login.
- IDs do dispositivo ou outros IDs: token de notificacao push, identificadores tecnicos.
- Audio: usado para chamadas de interfone.
- Fotos e videos: declarar camera se a feature usar video ou captura.
- Informacoes e desempenho do app: logs, diagnosticos, falhas e metricas tecnicas, se coletados.

Finalidades:
- Funcionalidade do app.
- Seguranca, prevencao de fraude e conformidade.
- Analise/diagnostico, se houver crash reporting ou monitoramento.
- Comunicacoes do desenvolvedor, se enviar avisos/notificacoes operacionais.

Compartilhamento:
- Declarar compartilhamento com provedores de backend, notificacoes, comunicacao em tempo real, autenticacao e infraestrutura quando eles processarem dados em nome do app.

Criptografia em transito:
- Marcar "sim" apenas se todas as comunicacoes sensiveis usam HTTPS/WSS/TLS.

Exclusao de dados:
- Informar o canal ou fluxo para solicitar exclusao de conta/dados, se aplicavel.

## APK/AAB assinado

Para Google Play, preferir **AAB assinado** em vez de APK.

Checklist:
- Confirmar nome publico: Confia System.
- Confirmar icone final em `1024x1024`.
- Gerar adaptive icon Android.
- Nome no `app.json` atualizado para `Confia System`.
- Package Android definitivo para loja: `br.com.confia.system`.
- Firebase Android recriado para `br.com.confia.system` no projeto `confia-system`.
- Gerar build de producao assinado.
- Testar instalacao em aparelho real.
- Enviar para teste interno antes da producao.

## Itens pendentes para finalizar

- CNPJ/nome juridico ou nome de desenvolvedor.
- E-mail de suporte.
- URL da politica de privacidade publicada.
- Dominio/site oficial.
- Lista real de SDKs usados em producao.
- Se o app grava audio/video ou apenas transmite chamadas.
- Processo de exclusao de conta/dados.
- Screenshots finais capturadas no app.
