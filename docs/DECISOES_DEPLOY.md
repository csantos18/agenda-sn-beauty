# Decisoes De Deploy - Agenda SN Beauty

## Objetivo

Encontrar uma alternativa ao Render free para reduzir a demora no primeiro acesso.

## Decisao Atual

Seguir com **Vercel** como teste rapido em paralelo.

Manter **Render** ativo ate a Vercel ser validada.

Status em 2026-05-08: Vercel abre home, arquivos estaticos, painel e API. O app reconhece Supabase configurado, mas `/api/health` permanece `503 degraded` porque a chave secreta do Supabase na Vercel retorna `Invalid API key`. Nao declarar producao final antes de corrigir somente `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY`.

## O Que Esta Aprovado Para Teste

### Vercel

Status: online para validacao, ainda nao oficial para producao final.

Motivos:

- tem plano Hobby;
- integra direto com GitHub;
- pode abrir o front-end com boa velocidade;
- o projeto foi adaptado para Express na Vercel usando `api/server.js`.

Condicao:

- para producao real, usar chave secreta valida do Supabase como banco.
- confirmar `/api/health` com `productionReady=true`.

## O Que Fica Pausado

### Railway

Status: pausado.

Motivo:

- a conta exibiu bloqueio para criar novo recurso gratuito.

Arquivo preservado:

- `railway.json`

### Koyeb

Status: descartado por enquanto.

Motivo:

- solicitou plano/cartao durante o cadastro.

Arquivos preservados:

- `Dockerfile`
- `.dockerignore`

## O Que Fica Para Futuro

### Cloudflare Pages

Status: possibilidade futura.

Motivo:

- e muito rapido para front-end;
- mas o projeto atual tem backend Express;
- exigiria separar front-end e API ou migrar rotas para Workers.

### Supabase

Status: recomendado para producao.

Uso:

- banco PostgreSQL;
- agendamentos;
- avaliacoes;
- dados administrativos;
- possivel autenticacao futura.

## Criterios Para Trocar O Link Oficial

Trocar do Render para Vercel somente quando:

1. A Vercel publicar o commit mais recente.
2. A home abrir sem erro.
3. `/api/health` responder.
4. O painel admin abrir.
5. O agendamento funcionar.
6. O tempo de abertura for melhor que o Render.
7. Cliente ou supervisor aprovar.
