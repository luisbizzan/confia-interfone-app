# Confia Interfone App

Aplicativo mobile do Confia Interfone Digital, construido em React Native com Expo.

## Fase atual

Fase 1: MVP funcional sem voz real, validando login, perfis, diretorio de unidades, fluxo de chamada e historico.

O login real usa Supabase Auth. Depois da autenticacao, o app chama `get_current_user_context` para identificar automaticamente se o usuario e `MORADOR` ou `PORTARIA`.

## Perfis do app

- Portaria: liga para unidades do condominio e recebe chamadas de moradores.
- Morador: liga para a portaria e para outras unidades do mesmo condominio.

## Comandos

```bash
npm install
npm run start
npm run android
npm run ios
npm run web
npm run typecheck
```

## Configuracao

Copie `.env.example` para `.env` e preencha:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Nunca coloque chaves administrativas ou `service_role_key` no app.

## Contratos de backend usados

- `get_current_user_context`
- `get_my_pending_calls`
- `get_my_call_history`
- `start_portaria_call`
- `start_unit_to_portaria_call`

Ainda falta no backend a RPC para chamada entre unidades do mesmo condominio.

## Documentacao

- `docs/ESCOPO-FASE-1.md`
- `docs/SEGURANCA-E-LOJAS.md`
