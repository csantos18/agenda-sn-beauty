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
SUPABASE_SERVICE_ROLE_KEY=sua-chave-secret-ou-service-role
NOTIFICATION_WEBHOOK_URL=https://seu-webhook
```

Se usar Supabase, execute antes o arquivo `supabase-schema.sql` no SQL Editor do Supabase. Se apenas a auditoria estiver faltando, execute `supabase-audit-schema.sql`.

## Vercel

Preencha manualmente na Vercel:

```text
NODE_ENV=production
ADMIN_PIN=sua-senha-forte-do-painel
ADMIN_SESSION_SECRET=uma-chave-aleatoria-com-32-caracteres-ou-mais
BUSINESS_TIME_ZONE=America/Sao_Paulo
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-secret-ou-service-role
```

Use uma chave secreta do Supabase: `service_role` nos projetos antigos ou `secret key` nos projetos novos. Nao use chave `anon` ou `publishable`.

Alternativas aceitas pelo app se o Supabase mostrar nomes novos:

```text
SUPABASE_SECRET_KEY=sua-chave-secret
SUPABASE_SECRET_KEYS={"default":"sua-chave-sb_secret"}
```

Na Vercel, sem uma chave secreta valida do Supabase, o app abre em modo degradado para nao derrubar a interface, mas `/api/health` fica `503` e a producao nao deve ser considerada final.

## Validacao Pos-Deploy

Depois de publicar:

1. Abra `/api/health`.
2. Confirme `status: "ok"`.
3. Confirme `persistentStorage: true`.
4. Confirme `databaseReady: true` e `auditReady: true`.
5. Abra `/admin`.
6. Entre com o valor de `ADMIN_PIN`.
7. Crie um agendamento teste.
8. Confirme o agendamento no painel.
9. Abra `/api/admin/monitor` logado e confirme `status: "ok"`.

## Regra De Producao

Em `NODE_ENV=production`, o app sinaliza erro em `/api/health` se faltar:

- `ADMIN_PIN`
- `ADMIN_SESSION_SECRET`
- `DATA_DIR` persistente ou Supabase
- Supabase na Vercel

Isso evita deploy aparentemente "online" com painel bloqueado ou armazenamento temporario.
