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

## Koyeb

Opcao para testar o projeto completo com Node.js/Express sem separar front-end e back-end neste momento.

Arquivos preparados:

- `Dockerfile`
- `.dockerignore`
- `package.json`

Configuracao recomendada:

- Runtime: Docker ou Node.js.
- Porta: usar variavel `PORT` da plataforma.
- Start command: `npm start`.
- Health check: `/api/health`.

Variaveis obrigatorias:

- `ADMIN_PIN`
- `ADMIN_SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Variavel opcional:

- `NOTIFICATION_WEBHOOK_URL`

Observacao:

Se o Koyeb entregar abertura mais rapida e estavel que o Render free, ele pode substituir o Render. Se nao entregar, manter Render temporariamente e avaliar Cloudflare Pages + Workers + Supabase.

## Railway

Opcao recomendada para testar o projeto completo sem reescrever o backend.

Arquivos preparados:

- `railway.json`
- `package.json`
- `server.js`

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

Estrategia:

1. Criar projeto Railway conectado ao GitHub.
2. Usar o repositorio `agenda-sn-beauty`.
3. Configurar variaveis.
4. Aguardar deploy.
5. Abrir `/api/health`.
6. Testar site publico, agenda e painel admin.
7. Comparar tempo de abertura com Render.
8. Manter Render ativo ate aprovar Railway.

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
