# Confia Interfone App

Aplicativo mobile do Confia Interfone Digital, construido em React Native com Expo.

## Fase atual

Fase 1: MVP funcional sem voz real, validando login, perfis, diretorio de unidades, fluxo de chamada e historico.

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

## Documentacao

- `docs/ESCOPO-FASE-1.md`
- `docs/SEGURANCA-E-LOJAS.md`
