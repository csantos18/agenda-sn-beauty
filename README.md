# Agenda SN Beauty

Aplicativo de agendamento criado para o **Sarah Neves Beauty Studio**, com front-end responsivo, back-end em Node.js/Express e persistência opcional em Supabase.

## Objetivo

Organizar os atendimentos do salão de forma simples para a cliente e segura para a profissional. A cliente escolhe serviço, profissional, data, horário e forma de pagamento; a profissional acompanha os agendamentos em um painel protegido.

## Recursos

- Catálogo de serviços com preço, duração e descrição.
- Agendamento com cliente, telefone, serviço, profissional, data e horário.
- Validação para evitar conflito entre atendimentos pelo tempo total de cada serviço.
- Painel administrativo protegido por login com senha e sessão HTTP-only.
- Página administrativa dedicada em `/admin`, separada da experiência pública da cliente.
- Filtro por data no painel administrativo.
- Dashboard administrativo com estatísticas da data selecionada.
- Monitor administrativo de Supabase, auditoria, notificações e volume de pedidos.
- Auditoria administrativa com eventos de login, backup, exportação e mudanças de status.
- Backup JSON protegido por sessão administrativa.
- Cancelamento, remarcação e conclusão de atendimentos.
- Avaliações das clientes com média de notas.
- Moderação administrativa de avaliações para remover depoimentos falsos ou inadequados.
- Confirmação do agendamento por WhatsApp com mensagem pronta.
- Confirmação com protocolo, status e resumo do horário solicitado.
- Consulta pública segura do próprio agendamento por telefone e data.
- Botão fixo de WhatsApp para contato rápido.
- Notificação automática opcional para a dona do salão via webhook.
- Seção de orientações para confirmação, atraso e bloqueio de horários.
- Página formal em `/termos` com privacidade, regra do sinal de 20% e responsabilidades.

## Como rodar

```bash
npm install
npm start
```

Depois acesse:

```text
http://localhost:5175
```

## Teste de entrega

## Atualizações operacionais

- O painel administrativo usa status `pendente`, `confirmado`, `cancelado` e `concluido`.
- A profissional pode confirmar, concluir, desmarcar, remarcar e chamar a cliente pelo WhatsApp.
- A agenda pode ser filtrada por status e exportada em CSV.
- A rota `/api/health` informa se o app está usando Supabase ou arquivo local.

Com o servidor rodando, execute:

```bash
npm run smoke
```

Para conferir os contratos responsivos de celular:

```bash
npm run mobile:check
```

Para abrir o app em um navegador headless e validar páginas, console, overflow, painel e screenshots:

```bash
npm run visual:check
```

Para testar o site publicado:

```bash
BASE_URL=https://agenda-sn-beauty.onrender.com npm run smoke
```

O teste valida abertura do app, APIs principais, cria um agendamento temporário, confirma bloqueio de horário duplicado, acessa o painel com `ADMIN_PIN` e cancela o agendamento de teste.

## Persistência

O app funciona de duas formas:

- **Supabase**: usado quando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configuradas.
- **Arquivo local**: fallback em `database.json`, útil para desenvolvimento e testes.

No Render Free, use Supabase para não perder agendamentos e avaliações em reinícios ou deploys.

## Configurar Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o conteúdo de `supabase-schema.sql`.
4. No Render, configure as variáveis de ambiente:

```text
ADMIN_PIN=sua-senha-administrativa
ADMIN_SESSION_SECRET=seu-segredo-de-sessao
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
NOTIFICATION_WEBHOOK_URL=https://exemplo.com/webhook-de-agendamento
```

Nunca coloque a `SUPABASE_SERVICE_ROLE_KEY` no front-end. Ela deve ficar apenas no servidor/Render.

`NOTIFICATION_WEBHOOK_URL` é opcional. Quando configurada, o back-end envia os dados do novo agendamento para um serviço externo, como Make, Zapier ou outro integrador.

Se o monitor administrativo mostrar **Auditoria pendente no Supabase**, execute novamente o `supabase-schema.sql` no SQL Editor para criar a tabela `audit_logs`. O site continua aceitando agendamentos mesmo se a auditoria ainda estiver pendente, mas a recomendação de produção é deixar a auditoria ativa.

Para importar os dados iniciais de `database.json` para o Supabase, configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env` local e execute:

```bash
npm run supabase:seed
```

Para confirmar se a auditoria persistente do Supabase está ativa:

```bash
npm run supabase:audit
```

Depois do deploy, confira `/api/health`. O campo `storage` deve mostrar `supabase`. Se mostrar `local-file`, o Render ainda não recebeu `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

## Regras de Segurança

- A agenda completa só pode ser acessada com login administrativo e sessão válida.
- Dados sensíveis de clientes, como telefone, não são exibidos na área pública.
- A `SUPABASE_SERVICE_ROLE_KEY` fica apenas em variável de ambiente no servidor.
- O front-end não recebe nem expõe chaves secretas.
- A senha administrativa não é salva no navegador; o acesso usa cookie HTTP-only com assinatura.
- O servidor usa headers de segurança básicos, limite de JSON e rate limit para escritas públicas.
- O login administrativo usa comparação segura de segredo e cookie HTTP-only assinado.
- Avaliações públicas têm limite separado, campo antispam invisível e bloqueio de duplicadas.
- Rotas assíncronas respondem erro controlado em caso de falha interna.
- O Supabase está com Row Level Security habilitado nas tabelas criadas pelo schema.
- A seção pública de privacidade informa quais dados são coletados e como são usados.
- Webhooks de notificação ficam apenas no servidor e não são expostos no front-end.
- Em produção com Supabase, o servidor grava cada agendamento/avaliação de forma pontual, sem apagar a base inteira.
- Rotas de monitoramento, auditoria, backup e exportação exigem sessão administrativa.
- O backup JSON deve ser baixado e guardado apenas pela responsável do salão.

## Regras de Negócio

- A mesma profissional não pode ter atendimentos ativos que se sobreponham pelo tempo de duração do serviço.
- O sistema só oferece horários em que o serviço consegue terminar dentro do expediente.
- Datas antigas não podem ser usadas para novos agendamentos.
- Segunda a sábado: 08:00 às 18:00.
- Domingos e feriados: 08:00 às 14:00.
- Cancelamentos devem ser combinados com o salão.
- O sinal de 20% é combinado pelo WhatsApp e não usa Pix/checkout online dentro do app.
- O restante é pago conforme orientação da profissional.
- Formas de pagamento aceitas: Pix, dinheiro, cartão de débito e cartão de crédito.
- Observações da cliente ficam salvas junto ao agendamento.
- Avaliações aceitam notas de 1 a 5.

## Rotas da API

- `GET /api/health`
- `GET /admin`
- `GET /api/services`
- `GET /api/professionals`
- `GET /api/payment-methods`
- `GET /api/availability?date=AAAA-MM-DD&professional=Jacinta%20Santos`
- `GET /api/client/appointments?phone=...&date=AAAA-MM-DD`
- `GET /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/monitor` com sessão administrativa
- `GET /api/admin/audit` com sessão administrativa
- `GET /api/admin/backup` com sessão administrativa
- `GET /api/admin/reviews` com sessão administrativa
- `DELETE /api/admin/reviews/:id` com sessão administrativa
- `GET /api/appointments` com sessão administrativa
- `POST /api/appointments`
- `PATCH /api/appointments/:id/cancel` com sessão administrativa
- `PATCH /api/appointments/:id/complete` com sessão administrativa
- `PATCH /api/appointments/:id/reschedule` com sessão administrativa
- `GET /api/reviews`
- `POST /api/reviews`

## Arquivos Principais

- `index.html`: estrutura da interface.
- `styles.css`: layout responsivo e estilos visuais.
- `script.js`: interação do front-end com a API.
- `server.js`: API, segurança, validações e persistência.
- `database.json`: dados iniciais e fallback local.
- `supabase-schema.sql`: tabelas necessárias no Supabase.
- `render.yaml`: configuração base do Render no plano Free.

