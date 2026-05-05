# Política de qualidade do Agenda SN Beauty

Este projeto deve ser entregue como uma agenda real de atendimento, não apenas como uma tela demonstrativa. Toda alteração precisa preservar as regras abaixo.

## Política e privacidade

- A página `/termos` deve permanecer acessível pelo site público.
- A cliente precisa ver, antes de agendar, que o sinal de reserva é de 20%.
- O formulário público deve exigir aceite dos termos e regras antes de criar agendamento.
- O site não deve prometer pagamento online quando o pagamento é combinado pelo WhatsApp.
- Dados pessoais de cliente não podem aparecer em consultas públicas além do necessário para confirmar o próprio agendamento.
- Arquivos internos do projeto, como `.env`, `database.json`, `server.js`, `package.json` e scripts, devem continuar bloqueados no navegador.

## Responsividade

- O layout deve funcionar sem estouro horizontal em celular, tablet, tablet em paisagem, notebook e desktop.
- A regra de responsividade vale para o site público, painel administrativo e página de termos.
- Grades devem preferir colunas fluidas (`auto-fit`, `minmax` e limites relativos) em vez de larguras rígidas.
- Textos de botões, cards, menus e filtros não podem ficar cortados.
- A auditoria obrigatória é `npm run responsive:audit`.

## Confiabilidade

- O sistema deve impedir dois agendamentos conflitantes para a mesma profissional.
- Horários ocupados devem sair da disponibilidade pública.
- A consulta da cliente deve encontrar o pedido pelo telefone e data sem expor dados privados.
- O painel administrativo deve exigir login e manter as rotas administrativas protegidas.
- O smoke test obrigatório é `npm run smoke`.

## Segurança

- A senha administrativa deve vir de `ADMIN_PIN`.
- A sessão administrativa deve usar cookie `HttpOnly`.
- Operações administrativas devem exigir sessão válida.
- Entradas de cliente devem ser sanitizadas antes de serem renderizadas na tela.
- O servidor deve manter headers de segurança e bloqueio de arquivos de projeto.

## Qualidade

- Toda mudança deve passar em `npm run quality` antes de entrega.
- Toda mudança de código deve passar em `npm run check`.
- Toda mudança visual deve passar em `npm run visual:check` e `npm run responsive:audit`.
- Mudanças em regras de agenda devem passar em `npm run smoke`.
- Acentos e textos em português devem ser mantidos legíveis no navegador.
- Artefatos gerados em `artifacts/` são apenas evidências de teste e não devem virar dependência do app.
- Imagens de portfólio em `docs/demo/` devem ser estáticas, leves e revisadas antes de entrarem no README.

## Regras de negócio

- Atendimento regular: segunda a sábado, das 08:00 às 18:00.
- Domingo e feriados: das 08:00 às 14:00.
- O horário final do serviço precisa caber dentro do expediente.
- O sinal de reserva é sempre 20% do valor do serviço.
- O pedido público começa como pendente e depende de confirmação da profissional.
- A tolerância de atraso é de 10 minutos.
- Cancelamentos e remarcações devem ser solicitados com antecedência, preferencialmente até 2 horas antes.
- Uma remarcação solicitada dentro do prazo pode reaproveitar o mesmo sinal, conforme disponibilidade.
- Faltas sem aviso podem causar perda do sinal e exigir confirmação antecipada em novos agendamentos.
- Cancelamento pelo salão deve permitir remarcação ou combinação de devolução do sinal.
- Status válidos: `pendente`, `confirmado`, `cancelado`, `concluido`.
- Agendamentos cancelados não bloqueiam novos horários.
- O painel deve permitir confirmar, cancelar, concluir, remarcar, exportar CSV e gerar backup JSON.
