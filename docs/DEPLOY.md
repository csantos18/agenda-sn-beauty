# Guia De Deploy - Agenda SN Beauty

## Caminho Oficial

Use o Render como ambiente principal. A Vercel pode ser usada para teste rapido, mas em Vercel o Supabase e obrigatorio porque o armazenamento local e temporario.

## Render

O arquivo `render.yaml` ja configura:

- `NODE_ENV=production`
- `DATA_DIR=/var/data`
- disco persistente em `/var/data`
- `BUSINESS_TIME_ZONE=America/Sao_Paulo`
- health check em `/api/health`

Preencha manualmente no Render:

```text
ADMIN_PIN=sua-senha-forte-do-painel
ADMIN_SESSION_SECRET=uma-chave-aleatoria-com-32-caracteres-ou-mais
```

Opcionais no Render:

```text
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
NOTIFICATION_WEBHOOK_URL=https://seu-webhook
```

Se usar Supabase, execute antes o arquivo `supabase-schema.sql` no SQL Editor do Supabase.

## Vercel

Preencha manualmente na Vercel:

```text
NODE_ENV=production
ADMIN_PIN=sua-senha-forte-do-painel
ADMIN_SESSION_SECRET=uma-chave-aleatoria-com-32-caracteres-ou-mais
BUSINESS_TIME_ZONE=America/Sao_Paulo
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Sem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, a producao na Vercel deve falhar de proposito para evitar perda de agendamentos.

## Validacao Pos-Deploy

Depois de publicar:

1. Abra `/api/health`.
2. Confirme `status: "ok"`.
3. Confirme `persistentStorage: true`.
4. Abra `/admin`.
5. Entre com o valor de `ADMIN_PIN`.
6. Crie um agendamento teste.
7. Confirme o agendamento no painel.
8. Abra `/api/admin/monitor` logado e confirme `status: "ok"`.

## Regra De Producao

Em `NODE_ENV=production`, o app agora trava na inicializacao se faltar:

- `ADMIN_PIN`
- `ADMIN_SESSION_SECRET`
- `DATA_DIR` persistente ou Supabase
- Supabase na Vercel

Isso evita deploy aparentemente "online" com painel bloqueado ou armazenamento temporario.
