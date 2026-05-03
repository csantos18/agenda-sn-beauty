# Changelog

Histórico de mudanças relevantes do Agenda SN Beauty.

## 2026-05-02

### Adicionado

- Politica de qualidade em `docs/quality-policy.md`, cobrindo privacidade, responsividade, confiabilidade, seguranca, qualidade e regras de negocio.
- Auditoria responsiva completa em `npm run responsive:audit`, com celular, tablet, tablet em paisagem, notebook e desktop.
- Comando `npm run quality` para rodar a bateria principal de validacao com servidor temporario para o smoke test.

- Confirmação pós-agendamento com protocolo, status e resumo do pedido.
- Teste automatizado para impedir conflito parcial entre atendimentos.
- Página administrativa dedicada em `/admin`, separada da página pública das clientes.
- Script `npm run supabase:seed` para importar dados locais para o Supabase.
- Consulta pública segura para cliente conferir o próprio agendamento por telefone e data.
- Textos públicos refinados para deixar claro que o horário solicitado fica pendente até confirmação.
- Monitor administrativo de saúde, auditoria, notificações e volume de pedidos.
- Backup JSON protegido por sessão administrativa.
- Moderação administrativa de avaliações.
- Teste visual com Playwright em `npm run visual:check`.
- Screenshots do site público, versão mobile e painel administrativo para o README.

### Alterado

- Disponibilidade agora considera a duração do serviço e só libera horários que terminam dentro do expediente.
- Segunda a sábado permanece das 08:00 às 18:00; domingos e feriados permanecem das 08:00 às 14:00.
- Escritas de agendamento passam por uma fila curta no servidor para reduzir risco de duas reservas simultâneas no mesmo intervalo.
- Persistência Supabase passa a gravar registros pontuais, sem apagar e recriar a base inteira.
- README reestruturado como vitrine técnica do projeto.
- Front-end público passa a usar a própria origem HTTP para chamadas de API, mantendo fallback para `file://`.

### Segurança

- Login administrativo usa comparação segura de segredo.
- Cookies administrativos respeitam conexão segura atrás do Render/proxy.
- Avaliações públicas ganharam limite separado, campo antispam invisível e bloqueio de duplicadas.
- Erros internos em rotas assíncronas retornam resposta controlada.
- Textos antigos com acentuação quebrada vindos do banco são normalizados antes de aparecerem para a cliente.
- Arquivos internos do projeto deixam de ser servidos publicamente pelo Express.
- CORS local fica desativado quando `NODE_ENV=production`.

### Validado

- `npm run check`
- `npm run smoke`
- `npm run mobile:check`
- `npm run visual:check`
- `npm audit --omit=dev`

## 2026-05-01

### Adicionado

- Integração opcional com Supabase para persistir agendamentos e avaliações.
- Notificação automática opcional de novo agendamento via webhook.
- Schema SQL para criar as tabelas `appointments` e `reviews`.
- Confirmação de agendamento por WhatsApp com mensagem pronta.
- Botão fixo de WhatsApp para contato rápido.
- Seção de orientações antes do agendamento.
- Seção de privacidade e termos de uso.
- Filtro por data no painel administrativo.
- Dashboard administrativo com estatísticas por data.
- Ação para marcar agendamento como concluído.
- Login administrativo com sessão HTTP-only no lugar de guardar PIN no navegador.
- Documentação de objetivo, regras de negócio, segurança e rotas da API.

### Alterado

- Texto de formas de pagamento ajustado para "Pix, dinheiro, débito e crédito".
- Back-end preparado para usar Supabase quando as variáveis de ambiente estiverem configuradas.
- Fallback local em `database.json` mantido para desenvolvimento e testes.

### Segurança

- Chave `SUPABASE_SERVICE_ROLE_KEY` mantida apenas no servidor via variável de ambiente.
- URL do webhook de notificação mantida apenas no servidor via variável de ambiente.
- Agenda completa continua protegida por senha administrativa e cookie de sessão assinado.
- Senha administrativa não é armazenada no navegador.
- Dados sensíveis de clientes não são exibidos na área pública.

### Validado

- Checagem sintática com `npm run check`.
- Fluxo de agendamento, bloqueio de horário, painel com PIN, conclusão e avaliações.
- Verificação de que a chave secreta do Supabase não aparece no front-end.
