# Changelog

Histórico de mudanças relevantes do Agenda SN Beauty.

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
- Documentação de objetivo, regras de negócio, segurança e rotas da API.

### Alterado

- Texto de formas de pagamento ajustado para "Pix, dinheiro, débito e crédito".
- Backend preparado para usar Supabase quando as variáveis de ambiente estiverem configuradas.
- Fallback local em `database.json` mantido para desenvolvimento e testes.

### Segurança

- Chave `SUPABASE_SERVICE_ROLE_KEY` mantida apenas no servidor via variável de ambiente.
- URL do webhook de notificação mantida apenas no servidor via variável de ambiente.
- Agenda completa continua protegida por `ADMIN_PIN`.
- Dados sensíveis de clientes não são exibidos na área pública.

### Validado

- Checagem sintática com `npm run check`.
- Fluxo de agendamento, bloqueio de horário, painel com PIN, conclusão e avaliações.
- Verificação de que a chave secreta do Supabase não aparece no front-end.
