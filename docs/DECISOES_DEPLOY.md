# Decisoes de Deploy - Agenda SN Beauty

## Objetivo

Encontrar uma alternativa ao Render free, porque o primeiro acesso pode demorar muito quando o servico esta dormindo.

## Ambiente atual

- Plataforma atual: Render.
- Status: manter ativo ate novo ambiente ser aprovado.
- Problema: demora no primeiro acesso em plano gratuito.

## Caminhos avaliados

### Koyeb

Status: descartado por enquanto.

Motivo:

- solicitou plano Pro/cartao durante o cadastro;
- nao atende ao objetivo atual de testar sem pagamento.

Observacao:

- `Dockerfile` e `.dockerignore` ficam preservados como suporte futuro para Docker.
- Koyeb nao e o caminho oficial atual.

### Railway

Status: descartado por enquanto para a conta atual.

Motivo:

- aceita projeto Node.js/Express;
- exige menos refatoracao que Cloudflare Workers ou Vercel Functions;
- e mais parecido com a arquitetura atual do Agenda SN Beauty.
- porem a conta usada exibiu bloqueio para criar novo recurso gratuito.

Arquivos relacionados:

- `railway.json`
- `package.json`
- `server.js`

### Cloudflare Pages

Status: caminho futuro para front-end rapido.

Motivo:

- excelente para site publico estatico;
- nao roda o `server.js` atual sozinho.

Uso recomendado:

- separar front-end;
- configurar `API_BASE_URL`;
- manter API em backend separado ou migrar para Workers/Supabase Edge Functions.

### Vercel

Status: caminho oficial atual para novo teste.

Motivo:

- otima para front-end;
- possui plano Hobby;
- o backend Express foi adaptado para API serverless usando `api/server.js`.

Condicao obrigatoria:

- usar Supabase em producao, pois `database.json` nao e banco definitivo em ambiente serverless.

### Supabase

Status: recomendado para banco e back-end multiusuario.

Uso atual/futuro:

- banco PostgreSQL;
- dados de agendamentos;
- avaliacoes;
- possivel autenticacao e Edge Functions.

## Decisao atual

Seguir com Vercel como teste em paralelo.

Nao derrubar Render ate:

1. Vercel publicar com sucesso.
2. `/api/health` responder.
3. Site publico abrir rapido.
4. Agendamento funcionar.
5. Painel admin funcionar.
6. Supabase estar ativo.
7. Cliente/supervisor aprovar.
