# Guia De Deploy - Agenda SN Beauty

## Render

1. Criar Web Service no Render.
2. Conectar o repositorio.
3. Usar `render.yaml` ou configurar manualmente.
4. Definir variaveis de ambiente.
5. Configurar Supabase para producao.
6. Rodar auditoria de qualidade antes de publicar.

## Variaveis Principais

- `PORT`: porta do servidor.
- `ADMIN_PIN`: senha administrativa.
- `SESSION_SECRET`: chave de sessao.
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
