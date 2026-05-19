# Confia Interfone App - Fase 1

## Objetivo

Construir o MVP mobile do Confia Interfone Digital em React Native, validando o fluxo operacional antes da integracao de voz real.

## Perfis

- Portaria: usuario vinculado ao condominio, criado no onboarding do backoffice.
- Morador: usuario vinculado a uma ou mais unidades do mesmo condominio.

## Regras de negocio

- A portaria pode ligar para unidades do seu proprio condominio.
- O morador pode ligar para a portaria do seu condominio.
- O morador pode ligar para outra unidade/casa do mesmo condominio.
- Nenhum usuario pode visualizar ou chamar unidades de outro condominio.
- Permissoes como "recebe chamadas", "faz chamadas" e "ativo" devem ser validadas pelo backend.
- Historico de chamadas deve registrar origem, destino, status, horario e condominio.

## Entregas da Fase 1

- Projeto React Native com Expo e TypeScript.
- Tema visual inicial do Confia.
- Login real com Supabase Auth.
- Identificacao automatica de perfil pelo RPC `get_current_user_context`.
- Home do morador com chamada para portaria e unidades.
- Home da portaria com status do dispositivo e chamada para unidades.
- Estrutura inicial para Supabase Auth.
- Sessao preparada para armazenamento seguro no dispositivo.
- Documentacao de seguranca, loja e roadmap.

## Fora da Fase 1

- Voz real.
- Video.
- Publicacao nas lojas.
- Push notification em producao.
- CallKit/ConnectionService.
- Chamada real de morador para outra unidade; exige nova RPC no backend.

## Proximas fases

1. Fase 1: MVP funcional sem voz real.
2. Fase 2: integracao de voz real.
3. Fase 3: chamadas em background, notificacoes e beta nas lojas.
4. Fase 4: publicacao oficial e hardening de producao.
