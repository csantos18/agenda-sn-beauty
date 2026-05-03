# Politica de qualidade do Agenda SN Beauty

Este projeto deve ser entregue como uma agenda real de atendimento, nao apenas como uma tela demonstrativa. Toda alteracao precisa preservar as regras abaixo.

## Politica e privacidade

- A pagina `/termos` deve permanecer acessivel pelo site publico.
- A cliente precisa ver, antes de agendar, que o sinal de reserva e de 20%.
- O formulario publico deve exigir aceite dos termos e regras antes de criar agendamento.
- O site nao deve prometer pagamento online quando o pagamento e combinado pelo WhatsApp.
- Dados pessoais de cliente nao podem aparecer em consultas publicas alem do necessario para confirmar o proprio agendamento.
- Arquivos internos do projeto, como `.env`, `database.json`, `server.js`, `package.json` e scripts, devem continuar bloqueados no navegador.

## Responsividade

- O layout deve funcionar sem estouro horizontal em celular, tablet, tablet em paisagem, notebook e desktop.
- A regra de responsividade vale para o site publico, painel administrativo e pagina de termos.
- Grades devem preferir colunas fluidas (`auto-fit`, `minmax` e limites relativos) em vez de larguras rigidas.
- Textos de botoes, cards, menus e filtros nao podem ficar cortados.
- A auditoria obrigatoria e `npm run responsive:audit`.

## Confiabilidade

- O sistema deve impedir dois agendamentos conflitantes para a mesma profissional.
- Horarios ocupados devem sair da disponibilidade publica.
- A consulta da cliente deve encontrar o pedido pelo telefone e data sem expor dados privados.
- O painel administrativo deve exigir login e manter as rotas administrativas protegidas.
- O smoke test obrigatorio e `npm run smoke`.

## Seguranca

- A senha administrativa deve vir de `ADMIN_PIN`.
- A sessao administrativa deve usar cookie `HttpOnly`.
- Operacoes administrativas devem exigir sessao valida.
- Entradas de cliente devem ser sanitizadas antes de serem renderizadas na tela.
- O servidor deve manter headers de seguranca e bloqueio de arquivos de projeto.

## Qualidade

- Toda mudanca deve passar em `npm run quality` antes de entrega.
- Toda mudanca de codigo deve passar em `npm run check`.
- Toda mudanca visual deve passar em `npm run visual:check` e `npm run responsive:audit`.
- Mudancas em regras de agenda devem passar em `npm run smoke`.
- Acentos e textos em portugues devem ser mantidos legiveis no navegador.
- Artefatos gerados em `artifacts/` sao apenas evidencias de teste e nao devem virar dependencia do app.

## Regras de negocio

- Atendimento regular: segunda a sabado, das 08:00 as 18:00.
- Domingo e feriados: das 08:00 as 14:00.
- O horario final do servico precisa caber dentro do expediente.
- O sinal de reserva e sempre 20% do valor do servico.
- O pedido publico comeca como pendente e depende de confirmacao da profissional.
- A tolerancia de atraso e de 10 minutos.
- Cancelamentos e remarcacoes devem ser solicitados com antecedencia, preferencialmente ate 2 horas antes.
- Uma remarcacao solicitada dentro do prazo pode reaproveitar o mesmo sinal, conforme disponibilidade.
- Faltas sem aviso podem causar perda do sinal e exigir confirmacao antecipada em novos agendamentos.
- Cancelamento pelo salao deve permitir remarcacao ou combinacao de devolucao do sinal.
- Status validos: `pendente`, `confirmado`, `cancelado`, `concluido`.
- Agendamentos cancelados nao bloqueiam novos horarios.
- O painel deve permitir confirmar, cancelar, concluir, remarcar, exportar CSV e gerar backup JSON.
