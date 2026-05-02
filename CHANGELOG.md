# Changelog

## 2026-05-02

### Adicionado

- Confirmacao pos-agendamento com protocolo, status e resumo do pedido.
- Teste automatizado para impedir conflito parcial entre atendimentos.
- Pagina administrativa dedicada em `/admin`, separada da pagina publica das clientes.

### Alterado

- Disponibilidade agora considera a duracao do servico e so libera horarios que terminam dentro do expediente.
- Segunda a sabado permanece das 08:00 as 18:00; domingos e feriados permanecem das 08:00 as 14:00.
- Escritas de agendamento passam por uma fila curta no servidor para reduzir risco de duas reservas simultaneas no mesmo intervalo.

### Seguranca

- Login administrativo usa comparacao segura de segredo.
- Cookies administrativos respeitam conexao segura atras do Render/proxy.
- Avaliacoes publicas ganharam limite separado, campo antispam invisivel e bloqueio de duplicadas.
- Erros internos em rotas assincronas retornam resposta controlada.

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
- Login administrativo com sessão HTTP-only no lugar de guardar PIN no navegador.
- Documentação de objetivo, regras de negócio, segurança e rotas da API.

### Alterado

- Texto de formas de pagamento ajustado para "Pix, dinheiro, débito e crédito".
- Backend preparado para usar Supabase quando as variáveis de ambiente estiverem configuradas.
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
