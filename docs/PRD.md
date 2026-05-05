# PRD - Agenda SN Beauty

## 1. Visao Geral

A **Agenda SN Beauty** e uma aplicacao web de agendamento para o Sarah Neves Beauty Studio. O produto permite que clientes escolham servico, profissional, data, horario e forma de pagamento, enquanto a administracao acompanha, confirma, cancela, conclui, remarca e audita atendimentos em um painel protegido.

O sistema foi criado para digitalizar a rotina de agendamentos de um estudio de beleza, reduzindo conflitos de horario, perda de informacoes e dependencia de controles manuais.

## 2. Problema

Estudios e saloes pequenos normalmente recebem agendamentos por mensagens, papel, planilhas ou conversas informais. Isso pode gerar:

- conflito de horarios;
- esquecimento de atendimentos;
- dificuldade para confirmar ou remarcar;
- falta de historico;
- pouca visibilidade sobre status dos pedidos;
- dificuldade para organizar avaliacoes e relatorios;
- risco de expor dados de clientes sem necessidade.

## 3. Objetivo do Produto

Criar uma agenda digital responsiva para organizar atendimentos de beleza, oferecendo uma experiencia simples para a cliente e um painel administrativo completo para a gestao do estudio.

O produto deve:

- permitir agendamento publico;
- impedir conflitos de horario;
- respeitar duracao real de cada servico;
- proteger a area administrativa;
- permitir gestao de status;
- oferecer consulta segura para a cliente;
- registrar avaliacoes;
- permitir exportacao e backup;
- manter regras de seguranca, privacidade e qualidade.

## 4. Publico-Alvo

### Usuario final

Clientes do Sarah Neves Beauty Studio que desejam agendar servicos de beleza com praticidade.

### Usuario administrativo

Profissionais ou responsaveis pelo estudio que precisam controlar agenda, horarios, status, avaliacoes, exportacoes e backups.

### Mercado

O produto se encaixa no mercado de saloes, estudios de beleza, profissionais autonomas, estetica, maquiagem, sobrancelhas, unhas e servicos com atendimento por horario.

## 5. Proposta de Valor

A Agenda SN Beauty centraliza o processo de agendamento em uma solucao simples, responsiva e segura.

Principais ganhos:

- menos conflitos de agenda;
- menos dependencia de atendimento manual;
- melhor experiencia para a cliente;
- controle administrativo dos atendimentos;
- visibilidade sobre status e historico;
- consulta segura do proprio agendamento;
- avaliacoes publicas moderadas;
- backup e exportacao de dados.

## 6. Escopo Atual

### Incluido

- Tela publica responsiva.
- Catalogo de servicos.
- Escolha de profissional, data e horario.
- Regra de sinal de 20%.
- Validacao de conflito por duracao real do servico.
- Consulta publica por telefone e data.
- Painel administrativo com login.
- Sessao administrativa protegida.
- Filtros por data, busca por cliente, status e visao semanal.
- Confirmacao, cancelamento, conclusao e remarcacao.
- Avaliacoes publicas.
- Moderacao administrativa de avaliacoes.
- Exportacao CSV.
- Backup JSON.
- Monitor de saude.
- Auditoria administrativa.
- Termos e privacidade.
- SEO local com dados estruturados Schema.org para salao de beleza, endereco, WhatsApp, horarios e catalogo de servicos.
- Persistencia em Supabase ou arquivo local.
- Testes de API, responsividade e navegador.

### Fora do Escopo Atual

- Pagamento online.
- Chat em tempo real.
- Cadastro publico de conta de cliente.
- Multiplas unidades de salao.
- Controle financeiro completo.
- Notificacao obrigatoria por WhatsApp oficial.
- Aplicativo mobile nativo.

## 7. Requisitos Funcionais

### RF01 - Listar servicos

O sistema deve exibir servicos com nome, descricao, preco e duracao.

### RF02 - Criar agendamento

A cliente deve conseguir criar agendamento informando dados pessoais, servico, profissional, data, horario e forma de pagamento.

### RF03 - Validar conflito de horario

O sistema deve impedir sobreposicao de agendamentos ativos para a mesma profissional.

### RF04 - Respeitar expediente

O sistema deve oferecer apenas horarios que caibam dentro do expediente configurado.

### RF05 - Consultar agendamento

A cliente deve conseguir consultar o proprio agendamento usando telefone e data, sem expor dados de terceiros.

### RF06 - Login administrativo

O painel administrativo deve exigir senha/sessao valida.

### RF07 - Listar e filtrar atendimentos

O painel deve permitir visualizar agenda por data, cliente, status e semana.

### RF08 - Atualizar status

O administrador deve conseguir confirmar, cancelar e concluir atendimentos.

### RF09 - Remarcar atendimento

O administrador deve conseguir remarcar atendimentos respeitando regras de conflito.

### RF10 - Gerenciar avaliacoes

Clientes podem enviar avaliacoes e o painel deve permitir moderacao.

### RF11 - Exportar e gerar backup

O administrador deve conseguir exportar CSV e gerar backup JSON.

### RF12 - Monitorar saude

O sistema deve possuir rota de saude para verificar storage, Supabase, notificacoes e auditoria.

## 8. Requisitos Nao Funcionais

### RNF01 - Responsividade

O sistema deve funcionar em celular, tablet, notebook e desktop, sem estouro horizontal.

Breakpoints de referencia para evolucao e auditoria:

- Celular: ate 768px.
- Tablet: 769px a 1024px.
- Desktop: acima de 1024px.

A navegacao mobile deve permanecer clara e acessivel. Caso a quantidade de links ou a largura disponivel prejudiquem a leitura, a evolucao recomendada e adotar menu hamburguer no mobile.

### RNF02 - Seguranca

O sistema deve proteger area administrativa, cookies, arquivos internos e dados sensiveis.

### RNF03 - Privacidade

Dados pessoais nao devem aparecer em consultas publicas alem do necessario.

### RNF04 - Confiabilidade

Regras de conflito, horario e status devem ser preservadas em todas as alteracoes.

### RNF05 - Manutenibilidade

O projeto deve manter separacao entre tela publica, painel, API, persistencia, scripts e documentacao.

### RNF06 - Qualidade

Mudancas devem passar por testes de sintaxe, smoke, responsividade, visual e auditoria de dependencias.

### RNF07 - SEO Local

O site deve expor dados estruturados para mecanismos de busca, incluindo nome do estudio, telefone/WhatsApp, endereco, area atendida, horario de funcionamento e principais servicos.

## 9. Regras de Negocio

- Datas antigas nao podem receber novos agendamentos.
- A mesma profissional nao pode ter atendimentos ativos sobrepostos.
- O horario final do servico precisa caber dentro do expediente.
- Segunda a sabado: 08:00 as 18:00.
- Domingos e feriados: 08:00 as 14:00.
- O sinal de reserva e sempre 20% do valor do servico.
- O app nao processa pagamento online; pagamento e combinado pelo WhatsApp.
- Status validos: `pendente`, `confirmado`, `cancelado`, `concluido`.
- Agendamentos cancelados nao bloqueiam novos horarios.
- Backup, exportacao, monitoramento e auditoria exigem login administrativo.

## 10. Fluxos Principais

### Fluxo da Cliente

1. Acessa o site publico.
2. Visualiza servicos e informacoes.
3. Escolhe servico.
4. Escolhe profissional.
5. Escolhe data e horario disponivel.
6. Informa dados de contato.
7. Confirma o pedido de agendamento.
8. Pode consultar o proprio agendamento por telefone e data.

### Fluxo Administrativo

1. Acessa o painel administrativo.
2. Realiza login.
3. Visualiza agendamentos.
4. Filtra por data, cliente, status ou semana.
5. Confirma, cancela, conclui ou remarca atendimento.
6. Modera avaliacoes.
7. Exporta CSV ou gera backup JSON.
8. Consulta monitor e auditoria.

## 11. Criterios de Aceite

- A cliente consegue abrir a tela publica.
- A cliente consegue visualizar servicos.
- A cliente consegue criar agendamento valido.
- O sistema bloqueia conflito de horario.
- O sistema nao oferece horarios fora do expediente.
- O painel administrativo exige login.
- O administrador consegue confirmar, cancelar, concluir e remarcar.
- A consulta publica nao expoe dados de terceiros.
- O sistema permite exportar CSV.
- O sistema permite gerar backup JSON.
- Avaliacoes podem ser enviadas e moderadas.
- A pagina de termos permanece acessivel.
- O layout funciona em celular, tablet e desktop.
- A responsividade considera celular ate 768px, tablet de 769px a 1024px e desktop acima de 1024px.
- O HTML contem dados estruturados Schema.org do tipo `BeautySalon`.
- O telefone, endereco, horario e catalogo de servicos aparecem nos dados estruturados.
- Testes de qualidade passam antes da entrega.

## 12. Metricas de Sucesso

- Reducao de conflitos de agenda.
- Reducao de atendimentos esquecidos.
- Aumento de agendamentos digitais.
- Tempo menor para localizar atendimento.
- Maior controle dos status.
- Uso recorrente de exportacao e backup.
- Avaliacoes publicas registradas com moderacao.

## 13. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
| --- | --- | --- |
| Cliente informar telefone errado | Medio | Consulta exige telefone e data; painel permite busca administrativa |
| Conflito de horarios | Alto | Validacao por duracao real do servico |
| Exposicao de dados sensiveis | Alto | Consulta publica limitada e arquivos internos bloqueados |
| Falha no Supabase | Medio | Fallback local em `database.json` |
| Senha administrativa fraca | Medio | Variavel `ADMIN_PIN` e sessao protegida |
| Mudancas quebrarem responsividade | Medio | Auditoria responsiva obrigatoria |

## 14. Roadmap

### Versao Atual

- Agenda publica.
- Painel administrativo.
- Validacao de conflitos.
- Avaliacoes.
- Exportacao e backup.
- Supabase opcional.
- Testes e auditoria visual.

### Proximas Melhorias

- PRD versionado e mantido como documento central.
- Ajuste dos breakpoints de responsividade para celular ate 768px, tablet de 769px a 1024px e desktop acima de 1024px.
- Menu hamburguer mobile caso a navegacao principal fique extensa.
- Login administrativo com usuario e senha individual.
- Dashboard com graficos.
- Historico detalhado por agendamento.
- Notificacao integrada com WhatsApp/e-mail.
- Melhor relatorio financeiro.
- Melhorias de acessibilidade.

### Evolucao de Producao

- Banco Supabase/PostgreSQL como padrao.
- Backup automatico agendado.
- Observabilidade e logs centralizados.
- Politica LGPD mais detalhada.
- Deploy com monitoramento continuo.

## 15. Documentos Relacionados

- `README.md`: documentacao tecnica e operacional.
- `docs/quality-policy.md`: politica de qualidade, seguranca e responsividade.
- `supabase-schema.sql`: estrutura de banco para Supabase.
- `render.yaml`: configuracao de deploy.

## 16. Resumo Executivo

A Agenda SN Beauty e uma solucao web para digitalizar agendamentos de um estudio de beleza. O produto resolve um problema real de organizacao, conflito de horarios e controle administrativo.

O sistema possui tela publica, painel protegido, regras de negocio, persistencia, seguranca, termos de privacidade, avaliacoes, exportacao, backup e testes. Este PRD formaliza o produto, seus objetivos, requisitos, regras e criterios de aceite, corrigindo a ausencia de um documento central de produto.
