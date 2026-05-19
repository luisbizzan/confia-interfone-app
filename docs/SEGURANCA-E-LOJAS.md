# Seguranca e lojas oficiais

## Seguranca do app

- Nunca incluir `service_role_key`, `ADMIN_API_SECRET`, senhas de banco ou chaves privadas no app.
- Usar apenas chave publica anon do Supabase no app.
- Validar perfil, condominio, unidade e permissoes no backend.
- Manter RLS ativo para impedir vazamento entre condominios.
- Armazenar sessao com `expo-secure-store`.
- Trafegar dados apenas por HTTPS.
- Registrar auditoria para login, chamadas e vinculo de dispositivo.
- Evitar logs com dados pessoais.

## Permissoes previstas

- Microfone: somente quando a voz real entrar.
- Notificacoes: para chamada recebida e chamada perdida.
- Camera: fora do MVP.
- Localizacao: fora do MVP.
- Contatos: fora do MVP.
- Fotos/arquivos: fora do MVP.

## Apple App Store

- App precisa ter uso real, nao apenas webview.
- Login de revisao deve estar disponivel quando houver envio para review.
- Descricao de uso do microfone e notificacoes deve ser clara.
- Politica de privacidade deve estar publica.
- Dados coletados devem ser declarados no App Privacy.

## Google Play

- Preencher Data Safety com os dados realmente coletados.
- Justificar permissoes sensiveis.
- Garantir que SDKs de terceiros nao coletem dados fora da finalidade declarada.
- Testar em closed/internal testing antes da publicacao aberta.

## LGPD

- Informar finalidade da coleta: operacao do interfone digital.
- Ter politica de privacidade publica.
- Definir retencao de historico de chamadas.
- Definir processo para exclusao ou anonimizacao quando aplicavel.
