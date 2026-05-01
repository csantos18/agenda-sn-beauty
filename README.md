# Agenda SN Beauty

Aplicativo de agendamento criado para o **Sarah Neves Beauty Studio**, com front-end responsivo e back-end em Node.js/Express.

## Recursos

- Catálogo de serviços com preço, duração e descrição.
- Agendamento com cliente, telefone, serviço, profissional, data e horário.
- Validação para evitar dois agendamentos no mesmo horário/profissional.
- Painel administrativo protegido por PIN.
- Filtro por data no painel.
- Cancelamento, remarcação e conclusão de atendimentos.
- Avaliações das clientes com média de notas.
- Confirmação do agendamento por WhatsApp com mensagem pronta.
- Botão fixo de WhatsApp para contato rápido.
- Seção de orientações para confirmação, atraso e bloqueio de horários.

## Como rodar

```bash
npm install
npm start
```

Depois acesse:

```text
http://localhost:5175
```

## Persistência

O app funciona de duas formas:

- **Supabase**: usado quando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configuradas.
- **Arquivo local**: fallback em `database.json`, útil para desenvolvimento e testes.

No Render Free, use Supabase para não perder agendamentos e avaliações em reinícios/deploys.

## Configurar Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o conteúdo de `supabase-schema.sql`.
4. No Render, configure as variáveis de ambiente:

```text
ADMIN_PIN=seu-pin-administrativo
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Nunca coloque a `SUPABASE_SERVICE_ROLE_KEY` no front-end. Ela deve ficar apenas no servidor/Render.

## Rotas da API

- `GET /api/health`
- `GET /api/services`
- `GET /api/professionals`
- `GET /api/payment-methods`
- `GET /api/availability?date=AAAA-MM-DD&professional=Jacinta%20Santos`
- `GET /api/appointments` com header `x-admin-pin`
- `POST /api/appointments`
- `PATCH /api/appointments/:id/cancel` com header `x-admin-pin`
- `PATCH /api/appointments/:id/complete` com header `x-admin-pin`
- `PATCH /api/appointments/:id/reschedule` com header `x-admin-pin`
- `GET /api/reviews`
- `POST /api/reviews`

## Regras de negócio

- A mesma profissional não pode ter dois atendimentos no mesmo horário.
- Datas antigas não podem ser usadas para novos agendamentos.
- Segunda a sábado: 08:00 às 18:00.
- Domingos e feriados: 08:00 às 14:00.
- Cancelamentos devem ser combinados com o salão.
- O pagamento é realizado presencialmente após o atendimento.
- Formas de pagamento aceitas: Pix, dinheiro, cartão de débito e cartão de crédito.
- Observações da cliente ficam salvas junto ao agendamento.
- Avaliações aceitam notas de 1 a 5.
