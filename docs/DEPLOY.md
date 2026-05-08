# Guia De Deploy - Agenda SN Beauty

## Estrategia Segura

Nao derrubar o ambiente atual antes de validar o novo.

Fluxo recomendado:

1. Manter o Render ativo.
2. Criar um novo deploy em paralelo.
3. Testar o novo link.
4. Validar com cliente/supervisor.
5. Trocar o link oficial somente depois da aprovacao.
6. Desativar o ambiente antigo apenas quando o novo estiver aprovado.

## Render

1. Criar Web Service no Render.
2. Conectar o repositorio.
3. Usar `render.yaml` ou configurar manualmente.
4. Definir variaveis de ambiente.
5. Configurar Supabase para producao.
6. Rodar auditoria de qualidade antes de publicar.

## Tentativa descartada: Koyeb

Koyeb foi avaliado como alternativa para rodar o projeto completo com Node.js/Express.

Motivo para nao seguir agora:

- durante o cadastro, a plataforma solicitou plano Pro/cartao;
- o objetivo atual e testar alternativa sem pagamento;
- manter Koyeb como caminho principal geraria ambiguidade.

Os arquivos `Dockerfile` e `.dockerignore` continuam no projeto porque podem ser uteis para Docker, VPS ou outra plataforma no futuro, mas **nao sao o caminho oficial atual**.

## Railway

Railway foi preparado como alternativa, mas a conta usada exibiu bloqueio para criar novo recurso gratuito.

Arquivos preparados:

- `railway.json`
- `package.json`
- `server.js`

Status atual:

- manter como opcao futura;
- nao tratar como caminho principal enquanto exigir upgrade.

## Vercel

Opcao oficial atual apos Koyeb e Railway exigirem upgrade/pagamento.

Arquivos preparados:

- `vercel.json`
- `api/server.js`
- `server.js`

Configuracao esperada:

- Framework Preset: Other.
- Install Command: `npm install`.
- API: rotas `/api/*` redirecionadas para `api/server.js`.
- Front-end: arquivos estaticos na raiz do projeto.

Variaveis obrigatorias:

- `ADMIN_PIN`
- `ADMIN_SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Variaveis recomendadas:

- `PRODUCTION_ORIGIN`: URL final da Vercel.
- `BUSINESS_TIME_ZONE`: `America/Sao_Paulo`.

Variavel opcional:

- `NOTIFICATION_WEBHOOK_URL`

Observacao importante:

Na Vercel, o projeto deve usar Supabase em producao. O arquivo `database.json` e apenas fallback local/desenvolvimento e nao deve ser tratado como banco definitivo em ambiente serverless.

Estrategia:

1. Criar projeto Vercel conectado ao GitHub.
2. Usar o repositorio `agenda-sn-beauty`.
3. Configurar variaveis.
4. Aguardar deploy.
5. Abrir `/api/health`.
6. Confirmar que `storage` retorna `supabase`.
7. Testar site publico, agenda e painel admin.
8. Comparar tempo de abertura com Render.
9. Manter Render ativo ate aprovar Vercel.

## Referencia Railway

Configuracao ja preparada para eventual retomada:

Configuracao esperada:

- Build: `npm install`
- Start: `npm start`
- Health check: `/api/health`
- Porta: Railway injeta `PORT` automaticamente.

Variaveis obrigatorias:

- `ADMIN_PIN`
- `ADMIN_SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Variavel opcional:

- `NOTIFICATION_WEBHOOK_URL`

## Variaveis Principais

- `PORT`: porta do servidor.
- `ADMIN_PIN`: senha administrativa.
- `ADMIN_SESSION_SECRET`: chave de sessao administrativa.
- `SUPABASE_URL`: URL do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chave server-side do Supabase.
- `NOTIFICATION_WEBHOOK_URL`: webhook opcional.

## Banco

Use `supabase-schema.sql` para criar as tabelas no Supabase. O arquivo `database.json` deve ficar apenas como fallback local/desenvolvimento.

## Validacao Pos-Deploy

- Abrir `/api/health`.
- Abrir tela publica.
- Criar agendamento teste.
- Entrar no painel.
- Confirmar, remarcar, cancelar e concluir agendamento teste.
- Rodar consulta publica.
- Validar termos e privacidade.
