# Relatorio Tecnico - Agenda SN Beauty

## Arquitetura

Aplicacao Node.js com Express, front-end em HTML/CSS/JavaScript e persistencia flexivel. Em producao, o projeto usa Supabase quando configurado; em desenvolvimento, usa `database.json` como fallback local.

## Componentes

- `server.js`: API, regras de negocio, sessoes, persistencia e seguranca.
- `index.html`, `script.js`, `styles.css`: experiencia publica de agendamento.
- `admin.html`, `admin.js`: painel administrativo.
- `termos.html`: termos e privacidade publica.
- `supabase-schema.sql`: schema de banco para producao.
- `scripts/`: testes, auditorias visuais e utilitarios.
- `docs/`: documentacao de produto, deploy, operacao e LGPD.

## Regras Tecnicas Relevantes

- Bloqueio de conflito por profissional, data, horario e duracao do servico.
- Horarios calculados dentro do expediente.
- Status controlados: pendente, confirmado, cancelado e concluido.
- Sessao administrativa com cookie `HttpOnly`.
- Rate limit em rotas sensiveis.
- Headers de seguranca e bloqueio de arquivos internos.
- Auditoria de eventos publicos e administrativos.

## Qualidade

O projeto inclui scripts para sintaxe, smoke test, auditoria responsiva, teste visual, qualidade geral e auditoria Supabase.
