# Time Tracking / Work Management Template — Documento de Planejamento

> **Objetivo:** Criar um template premium para a plataforma MasIA, seguindo a arquitetura do tenant-gateway. O projeto deve ser um SPA React + Vite, focado em gerenciamento de tempo, projetos e produtividade, sem backend próprio, comunicando-se apenas com o gateway através do CRUD genérico.

---

# Visão do Produto

O objetivo não é criar apenas um "Clockify Clone".

A ideia é criar uma plataforma de gestão de trabalho (Work Management), capaz de atender:

- Freelancers
- Agências
- Software Houses
- Consultorias
- Empresas de Marketing
- Escritórios
- Pequenos times

A funcionalidade principal é o registro de tempo, porém todo o restante gira em torno dessa informação.

---

# Conceito Principal

Toda informação nasce a partir de um Cliente.

Um Cliente possui Projetos.

Cada Projeto possui Tarefas.

Cada Tarefa recebe registros de tempo (Time Entries).

Esses registros alimentam:

- Dashboard
- Relatórios
- Financeiro
- Analytics
- Produtividade

---

# Fluxo Geral

```text
Cliente
    │
    ▼
Projeto
    │
    ▼
Task
    │
    ▼
Timer
    │
    ▼
Time Entry
    │
    ├────────► Dashboard
    │
    ├────────► Relatórios
    │
    ├────────► Analytics
    │
    └────────► Financeiro
```

---

# Estrutura do Sistema

## Dashboard

Primeira tela do sistema.

Objetivo:

Mostrar rapidamente como está a produtividade do usuário.

Widgets:

- Horas hoje
- Horas esta semana
- Horas este mês
- Receita
- Horas faturáveis
- Horas não faturáveis
- Projeto atual
- Últimas atividades
- Timer ativo
- Projetos ativos

Gráficos:

- Horas por dia
- Horas por projeto
- Horas por cliente
- Receita mensal
- Produtividade semanal

---

# Clientes

Representam quem contratou o serviço.

Cada cliente pode possuir diversos projetos.

Campos:

- Nome
- Empresa
- Email
- Telefone
- Website
- Valor/Hora padrão
- Status
- Observações

Relacionamentos:

Cliente

↓

Projetos

↓

Invoices

---

# Projetos

Cada cliente possui um ou mais projetos.

Campos:

- Nome
- Cliente
- Descrição
- Cor
- Status
- Estimativa de horas
- Horas utilizadas
- Data início
- Data fim
- Valor/Hora

Relacionamentos:

Projeto

↓

Tasks

↓

Time Entries

---

# Tasks

Cada projeto pode possuir inúmeras tarefas.

Exemplos:

- Design
- Frontend
- Backend
- Reunião
- Pesquisa
- Deploy
- Correções

Campos:

- Nome
- Projeto
- Descrição
- Prioridade
- Status
- Responsável
- Estimativa

Relacionamentos:

Task

↓

Time Entries

---

# Time Entries

É o coração do sistema.

Todo tempo registrado gera um Time Entry.

Campos:

- Projeto
- Task
- Cliente
- Data
- Hora início
- Hora fim
- Duração
- Billable
- Tags
- Observações

Relacionamentos:

Projeto

↓

Task

↓

Time Entry

↓

Dashboard

↓

Relatórios

↓

Financeiro

---

# Timer

O Timer deve ser extremamente simples.

Botões:

- Start
- Pause
- Stop

Enquanto estiver rodando:

- Mostrar contador
- Permitir alterar Task
- Permitir alterar Projeto
- Permitir alterar descrição

Ao clicar em Stop:

↓

Criar automaticamente um Time Entry.

---

# Tags

Servem para categorizar trabalho.

Exemplos:

- Frontend
- Backend
- Meeting
- Research
- Bug
- Design
- Deploy
- Support

Relacionamento:

Time Entry

↓

Tags

---

# Calendário

Visualização:

- Dia
- Semana
- Mês

Mostrar:

- Time Entries
- Reuniões
- Tasks
- Eventos

---

# Membros

Caso o template seja utilizado por empresas.

Campos:

- Nome
- Cargo
- Valor Hora
- Meta semanal
- Equipe

Relacionamentos:

Membro

↓

Projetos

↓

Time Entries

---

# Invoices

As Invoices podem ser geradas automaticamente.

Fluxo:

Cliente

↓

Selecionar período

↓

Buscar Time Entries faturáveis

↓

Gerar Invoice

Campos:

- Cliente
- Período
- Horas
- Valor Hora
- Total
- Status

---

# Relatórios

Todos os relatórios são baseados nos Time Entries.

Filtros:

- Cliente
- Projeto
- Task
- Membro
- Tag
- Data

Relatórios:

- Horas trabalhadas
- Receita
- Horas faturáveis
- Horas não faturáveis
- Cliente mais lucrativo
- Projeto mais lucrativo
- Tempo médio por Task
- Horas por colaborador

---

# Analytics

KPIs:

- Horas registradas
- Receita
- Média diária
- Média semanal
- Projeto mais ativo
- Cliente mais ativo
- Horário mais produtivo
- Tempo médio por tarefa

---

# Configurações

- Moeda
- Timezone
- Valor Hora padrão
- Dias úteis
- Jornada diária
- Formato de data
- Preferências do Timer

---

# Banco de Dados (Modelo Conceitual)

clients

↓

projects

↓

tasks

↓

time_entries

Além disso:

- contacts
- invoices
- invoice_items
- timers
- tags
- time_entry_tags
- teams
- users
- work_schedules

---

# Fluxo Completo

```text
Criar Cliente
        │
        ▼
Criar Projeto
        │
        ▼
Criar Tasks
        │
        ▼
Iniciar Timer
        │
        ▼
Timer gera Time Entry
        │
        ▼
Dashboard atualizado
        │
        ▼
Relatórios atualizados
        │
        ▼
Analytics atualizado
        │
        ▼
Financeiro atualizado
        │
        ▼
Gerar Invoice
```

---

# Estrutura de Navegação

Dashboard

Clientes

Projetos

Tasks

Timer

Time Entries

Calendário

Relatórios

Analytics

Invoices

Equipe

Configurações

---

# Ordem de Desenvolvimento

Para evitar retrabalho, o desenvolvimento deve seguir esta sequência:

1. Clientes
2. Projetos
3. Tasks
4. Time Entries (CRUD)
5. Timer
6. Dashboard
7. Relatórios
8. Calendário
9. Invoices
10. Analytics
11. Configurações

---

# Objetivo Visual

O template deve transmitir um aspecto premium, semelhante a plataformas como:

- Harvest
- Toggl Track
- Clockify
- Linear
- Vercel Dashboard
- Stripe Dashboard

Características:

- Fundo branco predominante
- Cards minimalistas
- Muito espaço em branco
- Bordas suaves
- Sombras discretas
- Gráficos modernos
- Verde e ciano como identidade visual
- Dashboard extremamente limpo
- Componentes reutilizáveis

---

# Contexto para o Próximo Chat

Neste novo chat, o foco será desenvolver este template como um produto completo para a arquitetura.

Os objetivos são:

- Modelar corretamente o banco de dados seguindo o padrão do tenant-gateway (owner_id, sem RLS, sem backend próprio).
- Definir todas as entidades e relacionamentos.
- Planejar as telas antes da implementação.
- Criar um fluxo de navegação consistente.
- Projetar dashboards e relatórios úteis.
- Definir a estrutura SQL respeitando as regras da documentação.
- Criar um template premium, reutilizável e preparado para ser publicado no hub.

A prioridade é construir primeiro uma boa arquitetura e modelagem. A implementação do frontend e da interface será feita posteriormente, sempre seguindo essa base.
