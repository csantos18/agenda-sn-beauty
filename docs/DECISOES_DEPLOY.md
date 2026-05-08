# Decisoes De Deploy - Agenda SN Beauty

## Objetivo

Encontrar uma alternativa ao Render free para reduzir a demora no primeiro acesso.

## Decisao Atual

Seguir com **Vercel** como teste rapido em paralelo.

Manter **Render** ativo ate a Vercel ser validada.

Status em 2026-05-08: Vercel abre home, arquivos estaticos, painel e API. Supabase, banco principal e auditoria estao ativos. `/api/health` responde `status: "ok"`, `productionReady: true`, `databaseReady: true`, `auditReady: true` e `configErrors: []`.

## O Que Esta Aprovado Para Teste

### Vercel

Status: aprovado para producao na Vercel.

Motivos:

- tem plano Hobby;
- integra direto com GitHub;
- pode abrir o front-end com boa velocidade;
- o projeto foi adaptado para Express na Vercel usando `api/server.js`.

Condicao:

- manter chave secreta valida do Supabase.
- confirmar `/api/health` com `productionReady=true`, `databaseReady=true` e `auditReady=true`.

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
