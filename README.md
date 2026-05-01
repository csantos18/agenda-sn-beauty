# Agenda SN Beauty

Aplicativo de agendamento criado por **Sarah Neves** para o **Jacinta Santos Beauty Studio**, com front-end responsivo e back-end em Node.js/Express.

## Recursos

- Catálogo de serviços com preço e duração.
- Agendamento com cliente, telefone, serviço, profissional, data e horário.
- Validação para evitar dois agendamentos no mesmo horário/profissional.
- Cancelamento e remarcação de atendimentos.
- Avaliações das clientes com média de notas.
- Forma de pagamento preferida: Pix, dinheiro, cartão de débito ou cartão de crédito.
- Campo de observações para preferências, alergias ou cuidados específicos.
- Combo especial de Dia das Mães.
- Persistência em `database.json`.
- PRD do produto dentro da página.

## Como rodar

```bash
npm install
npm start
```

Depois acesse:

```text
http://localhost:5175
```

## Rotas da API

- `GET /api/health`
- `GET /api/services`
- `GET /api/professionals`
- `GET /api/payment-methods`
- `GET /api/availability?date=AAAA-MM-DD`
- `GET /api/appointments`
- `POST /api/appointments`
- `PATCH /api/appointments/:id/cancel`
- `PATCH /api/appointments/:id/reschedule`
- `GET /api/reviews`
- `POST /api/reviews`

## Exemplos de requisições

Criar agendamento:

```http
POST /api/appointments
Content-Type: application/json
```

```json
{
  "client": "Ana Souza",
  "phone": "(61) 90000-0000",
  "serviceId": 5,
  "professional": "Jacinta Santos",
  "paymentMethod": "Pix",
  "notes": "Preferência por esmalte claro.",
  "date": "2026-05-04",
  "time": "10:00"
}
```

Cancelar agendamento:

```http
PATCH /api/appointments/1/cancel
```

Remarcar agendamento:

```http
PATCH /api/appointments/1/reschedule
Content-Type: application/json
```

```json
{
  "client": "Ana Souza",
  "phone": "(61) 90000-0000",
  "serviceId": 4,
  "professional": "Jacinta Santos",
  "paymentMethod": "Cartão de crédito",
  "notes": "Cuidado especial com cachos.",
  "date": "2026-05-05",
  "time": "14:00"
}
```

Criar avaliação:

```http
POST /api/reviews
Content-Type: application/json
```

```json
{
  "name": "Ana Souza",
  "rating": 5,
  "comment": "O aplicativo facilitou muito o agendamento."
}
```

## Regras de negócio

- A mesma profissional não pode ter dois atendimentos no mesmo horário.
- Datas antigas não podem ser usadas para novos agendamentos.
- Segunda a sábado: 08:00 às 18:00.
- Domingos e feriados: 08:00 às 14:00.
- Cancelamentos devem ser feitos com pelo menos 2 horas de antecedência.
- O pagamento é realizado presencialmente no salão após o atendimento.
- Formas de pagamento aceitas: Pix, dinheiro, cartão de débito e cartão de crédito.
- Observações da cliente ficam salvas junto ao agendamento.
- Avaliações aceitam notas de 1 a 5.
