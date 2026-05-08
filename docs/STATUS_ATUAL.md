# Status Atual - Agenda SN Beauty

Data: 2026-05-08

## Alinhamento

- Pasta local: alinhada com `origin/main`.
- GitHub remoto: alinhado com a pasta local.
- App Vercel: online e respondendo.

## Validacao Atual

- Site publico: abre.
- Painel admin: abre.
- API de servicos: responde.
- Senha admin validada: `ADMIN_PIN` configurado.
- Health: `503 degraded`.

## Bloqueio Unico

O bloqueio atual de producao final e a chave secreta do Supabase:

```text
Invalid API key
```

Corrigir somente uma variavel na Vercel:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Alternativa aceita pelo app:

```text
SUPABASE_SECRET_KEY
```

Nao mexer em `ADMIN_PIN`, `ADMIN_SESSION_SECRET`, `BUSINESS_TIME_ZONE` ou `SUPABASE_URL` enquanto o erro atual for `Invalid API key`.

## Criterio Para Declarar Producao Final

O projeto so deve ser declarado pronto para producao quando:

```json
{
  "status": "ok",
  "productionReady": true,
  "databaseReady": true,
  "configErrors": []
}
```

