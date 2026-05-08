# Guia De Deploy - Agenda SN Beauty

## Decisao Atual

O caminho oficial de teste e a **Vercel**.

O **Render** continua ativo como ambiente atual ate a Vercel ser aprovada.

Nao derrubar nenhum ambiente antes de validar o novo link com cliente ou supervisor.

## Ambientes

| Plataforma | Status | Uso |
| --- | --- | --- |
| Render | Ativo | Ambiente atual de demonstracao |
| Vercel | Em teste | Alternativa para abertura mais rapida |
| Railway | Pausado | Bloqueou criacao gratuita na conta atual |
| Koyeb | Descartado agora | Solicitou plano/cartao |
| Cloudflare Pages | Futuro | Exige separacao maior entre front-end e API |

## Deploy Na Vercel

Arquivos preparados:

- `vercel.json`
- `api/server.js`
- `server.js`
- `package.json`

Configuracao na Vercel:

- Preset: `Express`
- Root Directory: `./`
- Branch: `main`
- Install Command: `npm install`
- Project Name: `agenda-sn-beauty`

Variaveis obrigatorias:

- `ADMIN_PIN`
- `ADMIN_SESSION_SECRET`
- `BUSINESS_TIME_ZONE`

Valor obrigatorio para fuso horario:

```text
BUSINESS_TIME_ZONE=America/Sao_Paulo
```

Variaveis obrigatorias para producao real:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Variavel opcional:

- `NOTIFICATION_WEBHOOK_URL`

## Banco De Dados

Para teste visual, o projeto pode abrir sem Supabase.

Para producao real, usar Supabase. Na Vercel, `database.json` nao deve ser tratado como banco definitivo.

Arquivo de schema:

```text
supabase-schema.sql
```

## Validacao Pos-Deploy

Depois que a Vercel publicar o deploy correto, validar:

1. Abrir `/`.
2. Abrir `/api/health`.
3. Abrir `/admin`.
4. Criar um agendamento teste.
5. Entrar no painel admin.
6. Confirmar que o site abre mais rapido que o Render free.

## Regra De Seguranca

Nao trocar o link oficial para Vercel enquanto:

- a home nao abrir;
- `/api/health` nao responder;
- o painel admin nao abrir;
- o cliente ou supervisor nao aprovar.

## Referencia Render

O Render continua preservado com:

- `render.yaml`
- `npm start`
- `/api/health`

Problema conhecido: no plano gratuito, o primeiro acesso pode demorar porque o servico pode dormir.

## Referencia Railway

O Railway fica apenas como referencia futura.

Arquivo preservado:

```text
railway.json
```

Nao e o caminho oficial atual porque a conta exibiu bloqueio para criar novo recurso gratuito.

## Referencia Koyeb

Koyeb foi avaliado, mas nao e o caminho oficial atual.

Motivo:

- solicitou plano/cartao;
- o objetivo atual e testar sem pagamento;
- manter Koyeb como principal geraria ambiguidade.

Arquivos Docker preservados para uso futuro:

- `Dockerfile`
- `.dockerignore`
