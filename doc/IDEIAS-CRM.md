# Ideias trazidas do Time Tracking → adaptadas para o CRM

> Análise de quais conceitos do template de Work Management/Time Tracking (docs/) fazem
> sentido no **CellRM** (CRM de vendas). Filtro aplicado: só entra o que ajuda um vendedor
> a **registrar, organizar ou analisar vendas** E cabe no gateway (sem join, sem get-by-id,
> list-then-filter, `owner_id` do gateway).

Entidades atuais do CRM: `companies`, `contacts`, `deals` (BANT: `qualification`,
`qualification_score`, `stage_id`, `status`, `loss_reason`), `activities` (type
call/email/meeting/note/task, `due_date`, `completed_at`), `tags` (+ contact_tags/deal_tags),
`sales_goals` (goal_type, target_value, current_value, period_month/year), `segments`,
`pipelines`, `pipeline_stages` (win_probability), `loss_reasons`.

---

## ✅ Vale trazer (alto valor, encaixa)

| Ideia (time tracking)                     | Adaptação no CRM                                                                                          | Por quê                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Snapshot**                              | Congelar `company_name`, `contact_name`, `value`, `stage_name`, `owner_name` no deal ao fechar (won/lost) | Histórico não quebra se a empresa mudar/for excluída; encaixa no "sem join" |
| **Dados derivados nunca persistidos**     | Dashboard/forecast sempre calculados dos `deals`                                                          | Formaliza um princípio que o CRM já segue meio implícito                    |
| **Calendário (dia/semana/mês)**           | Calendário das `activities` com `due_date`                                                                | Vendedor enxerga a agenda; hoje só há lista                                 |
| **Metas c/ realizado vs. restante vs. %** | Enriquecer `sales_goals` com progresso + projeção do período                                              | Tabela já existe; falta a camada de cálculo/visual                          |
| **Activity Feed / timeline**              | Timeline cronológica por contato/empresa/deal                                                             | Ver todo o histórico do deal num lugar é core de CRM                        |
| **Relatórios com filtros**                | Win rate, ticket médio, ciclo de venda, conversão por estágio, ranking de reps                            | Analytics real sobre `deals`                                                |
| **Busca global**                          | Buscar contatos/empresas/deals/activities num campo só                                                    | Alto uso diário                                                             |

## 🟡 Talvez (feature maior — decidir depois)

- **Propostas/Orçamentos a partir do deal `won`** — análogo ao "invoice a partir de time entries". Módulo novo.
- **Visão de time para manager** — ranking/performance por rep (CRM é owner-scoped; manager vê o time). Depende de RBAC.

## ❌ Fora (viraria feature morta)

- Timer / Time Entries / horas faturáveis — não é o trabalho de um vendedor.
- Jornada de trabalho (work schedules) — irrelevante em vendas.

---

## Mini-spec dos 3 recomendados (menor esforço / maior valor)

### 1. Snapshot no fechamento do deal

- **Schema (`deals`, colunas novas, nullable):** `company_name text`, `contact_name text`,
  `stage_name_at_close text`, `owner_name text`, `closed_value numeric`, `closed_at timestamptz`.
  (`value`/`currency` já existem.) Nenhuma vira obrigatória — preenchidas só ao fechar.
- **Regra (app):** ao chamar `markDealWon`/`markDealLost`, além de `status`/`loss_reason`,
  gravar os snapshots resolvendo os nomes das listas já carregadas no front (sem join).
- **Uso:** relatórios de deals fechados leem os `*_name`/`closed_*` da própria linha.

### 2. Timeline por entidade

- **Sem schema novo** — reusa `activities` (já tem `contact_id`/`deal_id`/`company_id`,
  `created_at`, `completed_at`, `type`).
- **Componente:** `EntityTimeline` que recebe as activities filtradas no front
  (list-then-filter por `deal_id`/`contact_id`/`company_id`), ordena por data desc, renderiza
  `TimelineItem` por tipo (ícone lucide + título + corpo + data).
- **Onde:** aba/coluna no `DealDetailScreen`, `ContactDrawer`, `CompanyDrawer`.

### 3. Metas com progresso

- **Sem schema novo** — `sales_goals` já tem `target_value`/`current_value`/período.
- **Cálculo (app):** `current_value` = soma de deals `won` do período (por `owner_id`/tipo);
  progresso `% = current/target`; restante = `target - current`; projeção linear pelo dia do mês.
- **Tela:** `SalesGoalsScreen` mostra barra de progresso, valor realizado/meta, restante e
  projeção de fechamento do período.

---

## Próximo passo

Confirmar quais itens seguir → gerar o schema/migration + telas seguindo o contrato do
`Importantdoc.md` (owner_id do gateway, snake_case, sem join/get-by-id). Snapshot e Metas mexem
em schema; Timeline é só front.
